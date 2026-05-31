import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShoppingListDto } from './dto/create-shopping-list.dto';
import { AddItemDto, UpdateShoppingItemDto } from './dto/add-item.dto';
import { MealStatus } from '@prisma/client';

@Injectable()
export class ShoppingService {
  private readonly logger = new Logger(ShoppingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShoppingListDto) {
    const family = await this.prisma.family.findUnique({ where: { id: dto.familyId } });
    if (!family) throw new NotFoundException('Family not found');

    return this.prisma.shoppingList.create({
      data: {
        familyId: dto.familyId,
        userId,
        name: dto.name,
        description: dto.description ?? null,
        totalBudget: dto.totalBudget ?? null,
        isCompleted: false,
        totalCost: 0,
      },
      include: {
        user: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async findAll(familyId: string) {
    return this.prisma.shoppingList.findMany({
      where: { familyId },
      include: {
        user: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const list = await this.prisma.shoppingList.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } },
        items: { orderBy: [{ isPurchased: 'asc' }, { name: 'asc' }] },
      },
    });

    if (!list) throw new NotFoundException(`Shopping list ${id} not found`);
    return list;
  }

  async update(id: string, data: Partial<{ name: string; description: string; totalBudget: number }>) {
    await this.findOne(id);

    return this.prisma.shoppingList.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.shoppingList.delete({ where: { id } });
    return { message: 'Shopping list deleted successfully' };
  }

  async addItem(listId: string, dto: AddItemDto) {
    await this.findOne(listId);

    const item = await this.prisma.shoppingItem.create({
      data: {
        shoppingListId: listId,
        name: dto.name,
        category: dto.category,
        quantity: dto.quantity,
        unit: dto.unit,
        estimatedCost: dto.estimatedCost ?? 0,
        notes: dto.notes ?? null,
        isPurchased: false,
      },
    });

    // Update list total cost
    await this.recalculateListCost(listId);

    return item;
  }

  async updateItem(listId: string, itemId: string, dto: UpdateShoppingItemDto) {
    const list = await this.findOne(listId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException(`Item ${itemId} not found in list ${listId}`);

    const updated = await this.prisma.shoppingItem.update({
      where: { id: itemId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.quantity !== undefined && { quantity: dto.quantity }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost }),
        ...(dto.actualCost !== undefined && { actualCost: dto.actualCost }),
        ...(dto.isPurchased !== undefined && { isPurchased: dto.isPurchased }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.recalculateListCost(listId);
    return updated;
  }

  async removeItem(listId: string, itemId: string) {
    await this.findOne(listId);

    const item = await this.prisma.shoppingItem.findUnique({ where: { id: itemId } });
    if (!item || item.shoppingListId !== listId) {
      throw new NotFoundException(`Item ${itemId} not found in list ${listId}`);
    }

    await this.prisma.shoppingItem.delete({ where: { id: itemId } });
    await this.recalculateListCost(listId);

    return { message: 'Item removed successfully' };
  }

  async complete(listId: string) {
    const list = await this.findOne(listId);

    if (list.isCompleted) {
      throw new BadRequestException('Shopping list is already completed');
    }

    // Mark list as completed
    const updatedList = await this.prisma.shoppingList.update({
      where: { id: listId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
      include: {
        items: true,
        family: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Add purchased items to inventory
    const purchasedItems = updatedList.items.filter((i) => i.isPurchased);

    for (const item of purchasedItems) {
      const groceryItem = await this.prisma.groceryItem.create({
        data: {
          familyId: list.familyId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          costPerUnit: item.actualCost
            ? item.actualCost / item.quantity
            : item.estimatedCost
            ? item.estimatedCost / item.quantity
            : 0,
          totalCost: item.actualCost ?? item.estimatedCost ?? 0,
          purchaseDate: new Date(),
          isActive: true,
        },
      });

      // Create PURCHASE transaction
      await this.prisma.groceryTransaction.create({
        data: {
          groceryItemId: groceryItem.id,
          type: 'PURCHASE',
          quantity: item.quantity,
          unit: item.unit,
          notes: `Purchased from shopping list: ${list.name}`,
        },
      });

      // Link grocery item back to shopping item
      await this.prisma.shoppingItem.update({
        where: { id: item.id },
        data: { groceryItemId: groceryItem.id },
      });
    }

    return {
      ...updatedList,
      itemsAddedToInventory: purchasedItems.length,
    };
  }

  async generateFromShortages(userId: string, familyId: string, days = 7) {
    const family = await this.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) throw new NotFoundException('Family not found');

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    // Get planned meals
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

    // Aggregate requirements
    const requirements: Map<
      string,
      { ingredientId: string; name: string; needed: number; unit: string; category: string }
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
            category: ri.ingredient.category,
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

    // Determine what needs to be purchased
    const itemsToBuy: Array<{
      name: string;
      category: string;
      quantity: number;
      unit: string;
    }> = [];

    for (const [ingredientId, req] of requirements.entries()) {
      const available = inventoryMap.get(ingredientId) ?? 0;
      const shortage = req.needed - available;

      if (shortage > 0) {
        itemsToBuy.push({
          name: req.name,
          category: req.category,
          quantity: Math.ceil(shortage * 10) / 10, // round up to 1 decimal
          unit: req.unit,
        });
      }
    }

    if (itemsToBuy.length === 0) {
      return {
        message: 'No shortages found. All ingredients are sufficiently stocked.',
        shoppingList: null,
      };
    }

    // Create the shopping list
    const listName = `Auto-generated list for next ${days} days (${new Date().toLocaleDateString()})`;
    const shoppingList = await this.prisma.shoppingList.create({
      data: {
        familyId,
        userId,
        name: listName,
        description: `Generated from meal plan shortages for the next ${days} days`,
        isCompleted: false,
        totalCost: 0,
        items: {
          create: itemsToBuy.map((item) => ({
            name: item.name,
            category: item.category as any,
            quantity: item.quantity,
            unit: item.unit as any,
            estimatedCost: 0,
            isPurchased: false,
          })),
        },
      },
      include: {
        items: true,
        user: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } },
      },
    });

    return {
      message: `Shopping list generated with ${itemsToBuy.length} items`,
      shoppingList,
    };
  }

  private async recalculateListCost(listId: string) {
    const items = await this.prisma.shoppingItem.findMany({
      where: { shoppingListId: listId },
    });

    const totalCost = items.reduce(
      (sum, item) => sum + (item.actualCost ?? item.estimatedCost ?? 0),
      0,
    );

    await this.prisma.shoppingList.update({
      where: { id: listId },
      data: { totalCost },
    });
  }
}
