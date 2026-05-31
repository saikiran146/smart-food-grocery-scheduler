import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFruitDto } from './dto/create-fruit.dto';
import { UpdateFruitDto } from './dto/update-fruit.dto';
import { addDays, differenceInDays } from 'date-fns';

@Injectable()
export class FruitsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFruitDto) {
    const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : new Date();
    const expectedRipeDays = dto.expectedRipeDays ?? 5;
    const expiryDate = addDays(purchaseDate, expectedRipeDays + 2); // ripe + 2 day buffer

    return this.prisma.fruit.create({
      data: {
        familyId: dto.familyId,
        name: dto.name,
        quantity: dto.quantity,
        remainingQty: dto.quantity,
        purchaseDate,
        ripnessLevel: dto.ripnessLevel ?? 'UNRIPE',
        expectedRipeDays,
        expiryDate,
        costPerPiece: dto.costPerPiece ?? 0,
        notes: dto.notes,
      },
    });
  }

  async findAll(familyId: string, includeInactive = false) {
    return this.prisma.fruit.findMany({
      where: { familyId, ...(includeInactive ? {} : { isActive: true }) },
      include: { alerts: { where: { isRead: false }, orderBy: { sentAt: 'desc' }, take: 3 } },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async findOne(id: string) {
    const fruit = await this.prisma.fruit.findUnique({
      where: { id },
      include: { alerts: { orderBy: { sentAt: 'desc' } } },
    });
    if (!fruit) throw new NotFoundException('Fruit not found');
    return fruit;
  }

  async update(id: string, dto: UpdateFruitDto) {
    await this.findOne(id);
    const updateData: any = {};
    if (dto.remainingQty !== undefined) updateData.remainingQty = dto.remainingQty;
    if (dto.ripnessLevel !== undefined) updateData.ripnessLevel = dto.ripnessLevel;
    if (dto.expectedRipeDays !== undefined) {
      updateData.expectedRipeDays = dto.expectedRipeDays;
      const fruit = await this.prisma.fruit.findUnique({ where: { id } });
      updateData.expiryDate = addDays(fruit!.purchaseDate, dto.expectedRipeDays + 2);
    }
    return this.prisma.fruit.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.fruit.update({ where: { id }, data: { isActive: false } });
  }

  async consume(id: string, quantity: number) {
    const fruit = await this.findOne(id);
    if (quantity > fruit.remainingQty) {
      throw new BadRequestException('Cannot consume more than remaining quantity');
    }
    const newQty = fruit.remainingQty - quantity;
    return this.prisma.fruit.update({
      where: { id },
      data: {
        remainingQty: newQty,
        isActive: newQty > 0,
      },
    });
  }

  async getAlerts(familyId: string) {
    const fruits = await this.prisma.fruit.findMany({
      where: { familyId, isActive: true },
      include: { alerts: { where: { isRead: false }, orderBy: { sentAt: 'desc' } } },
    });
    return fruits.flatMap((f) =>
      f.alerts.map((a) => ({
        ...a,
        fruitName: f.name,
        remainingQty: f.remainingQty,
        ripnessLevel: f.ripnessLevel,
      })),
    );
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async checkFruitExpiry() {
    const now = new Date();
    const activeFruits = await this.prisma.fruit.findMany({
      where: { isActive: true },
    });

    for (const fruit of activeFruits) {
      if (!fruit.expiryDate) continue;
      const daysUntilExpiry = differenceInDays(fruit.expiryDate, now);

      let alertType: string | null = null;
      let message = '';

      if (daysUntilExpiry < 0) {
        alertType = 'LIKELY_TO_SPOIL';
        message = `${fruit.name} has likely spoiled. Consider discarding ${fruit.remainingQty} remaining pieces.`;
        await this.prisma.fruit.update({ where: { id: fruit.id }, data: { ripnessLevel: 'OVERRIPE' } });
      } else if (daysUntilExpiry === 0) {
        alertType = 'EXPIRING_TODAY';
        message = `${fruit.name} is expiring today! Use ${fruit.remainingQty} remaining pieces urgently.`;
      } else if (daysUntilExpiry <= 2) {
        alertType = 'EAT_SOON';
        message = `${fruit.name} will expire in ${daysUntilExpiry} day(s). ${fruit.remainingQty} pieces remaining.`;
      }

      if (alertType) {
        const existing = await this.prisma.fruitAlert.findFirst({
          where: { fruitId: fruit.id, alertType, isRead: false },
        });
        if (!existing) {
          await this.prisma.fruitAlert.create({
            data: { fruitId: fruit.id, alertType, message },
          });
        }
      }
    }
  }
}
