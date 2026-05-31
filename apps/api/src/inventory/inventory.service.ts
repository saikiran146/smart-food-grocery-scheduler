import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroceryDto } from './dto/create-grocery.dto';
import { UpdateGroceryDto } from './dto/update-grocery.dto';
import { GroceryFilterDto } from './dto/grocery-filter.dto';
import { MealStatus, TransactionType, Unit } from '@prisma/client';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGroceryDto) {
    const family = await this.prisma.family.findUnique({ where: { id: dto.familyId } });
    if (!family) throw new NotFoundException('Family not found');

    return this.prisma.groceryItem.create({
      data: {
        familyId: dto.familyId,
        ingredientId: dto.ingredientId ?? null,
        name: dto.name,
        category: dto.category,
        quantity: dto.quantity,
        unit: dto.unit,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : new Date(),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        costPerUnit: dto.costPerUnit ?? 0,
        totalCost: dto.totalCost ?? 0,
        storageLocation: dto.storageLocation ?? 'PANTRY',
        brand: dto.brand ?? null,
        notes: dto.notes ?? null,
        isActive: true,
      },
      include: { ingredient: true },
    });
  }

  async findAll(filters: GroceryFilterDto) {
    if (!filters.familyId) throw new BadRequestException('familyId is required');

    const where: any = { familyId: filters.familyId, isActive: true };

    if (filters.category) where.category = filters.category;
    if (filters.storageLocation) where.storageLocation = filters.storageLocation;
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.expiringInDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + filters.expiringInDays);
      where.expiryDate = { lte: cutoff };
    }

    return this.prisma.groceryItem.findMany({
      where,
      include: { ingredient: true },
      orderBy: [{ expiryDate: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.groceryItem.findUnique({
      where: { id },
      include: {
        ingredient: true,
        transactions: { orderBy: { performedAt: 'desc' }, take: 50 },
      },
    });

    if (!item) throw new NotFoundException(`Grocery item ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateGroceryDto) {
    await this.findOne(id);

    return this.prisma.groceryItem.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.purchaseDate !== undefined && { purchaseDate: new Date(dto.purchaseDate) }),
        ...(dto.expiryDate !== undefined && { expiryDate: new Date(dto.expiryDate) }),
        ...(dto.costPerUnit !== undefined && { costPerUnit: dto.costPerUnit }),
        ...(dto.totalCost !== undefined && { totalCost: dto.totalCost }),
        ...(dto.storageLocation !== undefined && { storageLocation: dto.storageLocation }),
        ...(dto.brand !== undefined && { brand: dto.brand }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { ingredient: true },
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);

    await this.prisma.groceryItem.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Grocery item deactivated successfully' };
  }

  async adjust(id: string, quantity: number, notes?: string) {
    const item = await this.findOne(id);

    const newQty = item.quantity + quantity;
    if (newQty < 0) {
      throw new BadRequestException(
        `Adjustment would result in negative quantity. Current: ${item.quantity}, Adjustment: ${quantity}`,
      );
    }

    const updatedItem = await this.prisma.groceryItem.update({
      where: { id },
      data: { quantity: newQty, isActive: newQty > 0 },
      include: { ingredient: true },
    });

    await this.prisma.groceryTransaction.create({
      data: {
        groceryItemId: id,
        type: TransactionType.ADJUSTMENT,
        quantity: Math.abs(quantity),
        unit: item.unit,
        notes: notes ?? `Manual adjustment: ${quantity > 0 ? '+' : ''}${quantity}`,
      },
    });

    return updatedItem;
  }

  async getExpiring(familyId: string, days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return this.prisma.groceryItem.findMany({
      where: {
        familyId,
        isActive: true,
        expiryDate: { not: null, lte: cutoff },
      },
      include: { ingredient: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getLowStock(familyId: string) {
    // Items with quantity <= 10% of typical purchase or quantity <= a small threshold
    // Using quantity < 0.2 as a low-stock heuristic (very low)
    return this.prisma.groceryItem.findMany({
      where: {
        familyId,
        isActive: true,
        quantity: { lte: 0.2 },
      },
      include: { ingredient: true },
      orderBy: { quantity: 'asc' },
    });
  }

  async getShortages(familyId: string, days = 7) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Get all planned meals for the family in the next N days
    const plannedMeals = await this.prisma.mealSchedule.findMany({
      where: {
        familyId,
        status: MealStatus.PLANNED,
        scheduledAt: { gte: new Date(), lte: endDate },
      },
      include: {
        recipe: {
          include: { ingredients: { include: { ingredient: true } } },
        },
      },
    });

    // Aggregate ingredient requirements
    const requirements: Map<
      string,
      { ingredientId: string; name: string; needed: number; unit: Unit }
    > = new Map();

    for (const meal of plannedMeals) {
      if (!meal.recipe) continue;
      const ratio = meal.servings / meal.recipe.servings;

      for (const ri of meal.recipe.ingredients) {
        const key = ri.ingredientId;
        const existing = requirements.get(key);
        const qty = ri.quantity * ratio;

        if (existing) {
          existing.needed += qty;
        } else {
          requirements.set(key, {
            ingredientId: ri.ingredientId,
            name: ri.ingredient.name,
            needed: qty,
            unit: ri.unit,
          });
        }
      }
    }

    // Get current inventory
    const inventory = await this.prisma.groceryItem.findMany({
      where: { familyId, isActive: true },
    });

    const inventoryMap: Map<string, number> = new Map();
    for (const item of inventory) {
      if (item.ingredientId) {
        const current = inventoryMap.get(item.ingredientId) ?? 0;
        inventoryMap.set(item.ingredientId, current + item.quantity);
      }
    }

    // Find shortages
    const shortages: Array<{
      ingredientId: string;
      name: string;
      needed: number;
      available: number;
      shortage: number;
      unit: string;
    }> = [];

    for (const [ingredientId, req] of requirements.entries()) {
      const available = inventoryMap.get(ingredientId) ?? 0;
      if (available < req.needed) {
        shortages.push({
          ingredientId,
          name: req.name,
          needed: req.needed,
          available,
          shortage: req.needed - available,
          unit: req.unit,
        });
      }
    }

    return {
      familyId,
      days,
      totalMealsPlanned: plannedMeals.length,
      shortages,
    };
  }
}
