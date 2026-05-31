import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWasteDto } from './dto/create-waste.dto';
import { startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class WasteService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWasteDto) {
    return this.prisma.wasteLog.create({
      data: {
        ...dto,
        userId,
        wastedAt: dto.wastedAt ? new Date(dto.wastedAt) : new Date(),
        costWasted: dto.costWasted ?? 0,
      },
    });
  }

  async findAll(familyId: string, filters: { startDate?: string; endDate?: string; wasteCategory?: string }) {
    return this.prisma.wasteLog.findMany({
      where: {
        familyId,
        ...(filters.wasteCategory && { wasteCategory: filters.wasteCategory as any }),
        ...(filters.startDate || filters.endDate
          ? {
              wastedAt: {
                ...(filters.startDate && { gte: new Date(filters.startDate) }),
                ...(filters.endDate && { lte: new Date(filters.endDate) }),
              },
            }
          : {}),
      },
      orderBy: { wastedAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });
  }

  async findOne(id: string, userId: string) {
    const log = await this.prisma.wasteLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('Waste log not found');
    return log;
  }

  async remove(id: string, userId: string) {
    const log = await this.findOne(id, userId);
    if (log.userId !== userId) throw new ForbiddenException('Not authorized');
    return this.prisma.wasteLog.delete({ where: { id } });
  }

  async getSummary(familyId: string, month?: number, year?: number) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const start = startOfMonth(new Date(y, m - 1, 1));
    const end = endOfMonth(start);

    const [wasteLogs, purchases] = await Promise.all([
      this.prisma.wasteLog.findMany({
        where: { familyId, wastedAt: { gte: start, lte: end } },
      }),
      this.prisma.groceryItem.findMany({
        where: { familyId, purchaseDate: { gte: start, lte: end } },
        select: { quantity: true, totalCost: true },
      }),
    ]);

    const totalPurchased = purchases.reduce((s, i) => s + i.quantity, 0);
    const totalWasted = wasteLogs.reduce((s, l) => s + l.quantity, 0);
    const totalWasteCost = wasteLogs.reduce((s, l) => s + l.costWasted, 0);
    const monthlyWastePercent = totalPurchased > 0 ? (totalWasted / totalPurchased) * 100 : 0;

    const byItem: Record<string, { quantity: number; cost: number }> = {};
    const byCategory: Record<string, { quantity: number; cost: number }> = {};
    const byReason: Record<string, { count: number; cost: number }> = {};

    for (const log of wasteLogs) {
      byItem[log.itemName] = byItem[log.itemName] ?? { quantity: 0, cost: 0 };
      byItem[log.itemName].quantity += log.quantity;
      byItem[log.itemName].cost += log.costWasted;

      byCategory[log.category] = byCategory[log.category] ?? { quantity: 0, cost: 0 };
      byCategory[log.category].quantity += log.quantity;
      byCategory[log.category].cost += log.costWasted;

      byReason[log.wasteCategory] = byReason[log.wasteCategory] ?? { count: 0, cost: 0 };
      byReason[log.wasteCategory].count += 1;
      byReason[log.wasteCategory].cost += log.costWasted;
    }

    const mostWastedItems = Object.entries(byItem)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    return {
      monthlyWastePercent: Math.round(monthlyWastePercent * 10) / 10,
      totalWasteCost,
      mostWastedItems,
      wasteByCategory: Object.entries(byCategory).map(([category, v]) => ({ category, ...v })),
      wasteByReason: Object.entries(byReason).map(([reason, v]) => ({ reason, ...v })),
      totalLogs: wasteLogs.length,
    };
  }
}
