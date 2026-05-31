import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealDto } from './dto/create-meal.dto';
import { UpdateMealDto } from './dto/update-meal.dto';
import { MealStatus } from '@prisma/client';

@Injectable()
export class MealsService {
  private readonly logger = new Logger(MealsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateMealDto) {
    if (!dto.recipeId && !dto.customMealName) {
      throw new BadRequestException('Either recipeId or customMealName is required');
    }

    if (dto.recipeId) {
      const recipe = await this.prisma.recipe.findUnique({ where: { id: dto.recipeId } });
      if (!recipe) throw new NotFoundException('Recipe not found');
    }

    const family = await this.prisma.family.findUnique({ where: { id: dto.familyId } });
    if (!family) throw new NotFoundException('Family not found');

    return this.prisma.mealSchedule.create({
      data: {
        familyId: dto.familyId,
        userId,
        recipeId: dto.recipeId ?? null,
        customMealName: dto.customMealName ?? null,
        mealType: dto.mealType,
        scheduledAt: new Date(dto.scheduledAt),
        servings: dto.servings,
        notes: dto.notes ?? null,
        status: MealStatus.PLANNED,
      },
      include: {
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
        user: { select: { id: true, name: true, email: true } },
        family: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(filters: {
    familyId: string;
    startDate?: string;
    endDate?: string;
    status?: MealStatus;
    mealType?: string;
  }) {
    const where: any = { familyId: filters.familyId };

    if (filters.startDate || filters.endDate) {
      where.scheduledAt = {};
      if (filters.startDate) where.scheduledAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.scheduledAt.lte = new Date(filters.endDate);
    }

    if (filters.status) where.status = filters.status;
    if (filters.mealType) where.mealType = filters.mealType;

    return this.prisma.mealSchedule.findMany({
      where,
      include: {
        recipe: { select: { id: true, name: true, imageUrl: true, estimatedCost: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const meal = await this.prisma.mealSchedule.findUnique({
      where: { id },
      include: {
        recipe: {
          include: { ingredients: { include: { ingredient: true } } },
        },
        user: { select: { id: true, name: true, email: true } },
        family: { select: { id: true, name: true } },
      },
    });

    if (!meal) throw new NotFoundException(`Meal with id ${id} not found`);
    return meal;
  }

  async update(id: string, dto: UpdateMealDto) {
    await this.findOne(id);

    return this.prisma.mealSchedule.update({
      where: { id },
      data: {
        ...(dto.mealType && { mealType: dto.mealType }),
        ...(dto.status && { status: dto.status }),
        ...(dto.scheduledAt && { scheduledAt: new Date(dto.scheduledAt) }),
        ...(dto.servings !== undefined && { servings: dto.servings }),
        ...(dto.customMealName !== undefined && { customMealName: dto.customMealName }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.estimatedCost !== undefined && { estimatedCost: dto.estimatedCost }),
        ...(dto.actualCost !== undefined && { actualCost: dto.actualCost }),
      },
      include: {
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
        user: { select: { id: true, name: true } },
        family: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.mealSchedule.delete({ where: { id } });
    return { message: 'Meal deleted successfully' };
  }

  async complete(id: string) {
    const meal = await this.findOne(id);

    if (meal.status === MealStatus.COMPLETED) {
      throw new BadRequestException('Meal is already marked as completed');
    }

    // Mark meal as completed
    const updatedMeal = await this.prisma.mealSchedule.update({
      where: { id },
      data: {
        status: MealStatus.COMPLETED,
        completedAt: new Date(),
      },
      include: {
        recipe: { include: { ingredients: { include: { ingredient: true } } } },
        family: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    // Deduct inventory if recipe exists
    if (updatedMeal.recipe && updatedMeal.recipe.ingredients.length > 0) {
      const servingsRatio = updatedMeal.servings / updatedMeal.recipe.servings;

      for (const recipeIngredient of updatedMeal.recipe.ingredients) {
        const neededQty = recipeIngredient.quantity * servingsRatio;
        const ingredientName = recipeIngredient.ingredient.name;

        // Find matching grocery items for this family
        const groceryItems = await this.prisma.groceryItem.findMany({
          where: {
            familyId: updatedMeal.familyId,
            isActive: true,
            OR: [
              { ingredientId: recipeIngredient.ingredientId },
              { name: { contains: ingredientName, mode: 'insensitive' } },
            ],
          },
          orderBy: { expiryDate: 'asc' },
        });

        let remaining = neededQty;

        for (const item of groceryItems) {
          if (remaining <= 0) break;

          const deduct = Math.min(remaining, item.quantity);
          const newQty = item.quantity - deduct;

          await this.prisma.groceryItem.update({
            where: { id: item.id },
            data: { quantity: newQty, isActive: newQty > 0 },
          });

          await this.prisma.groceryTransaction.create({
            data: {
              groceryItemId: item.id,
              type: 'CONSUMPTION',
              quantity: deduct,
              unit: item.unit,
              notes: `Consumed for meal: ${updatedMeal.recipe.name}`,
              mealScheduleId: id,
            },
          });

          remaining -= deduct;
        }

        if (remaining > 0) {
          this.logger.warn(
            `Insufficient inventory for ingredient ${ingredientName}. Short by ${remaining} ${recipeIngredient.unit}`,
          );
        }
      }
    }

    return updatedMeal;
  }

  async skip(id: string) {
    const meal = await this.findOne(id);

    if (meal.status === MealStatus.SKIPPED) {
      throw new BadRequestException('Meal is already marked as skipped');
    }

    return this.prisma.mealSchedule.update({
      where: { id },
      data: { status: MealStatus.SKIPPED },
      include: {
        recipe: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async getCalendar(familyId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const meals = await this.prisma.mealSchedule.findMany({
      where: {
        familyId,
        scheduledAt: { gte: startDate, lte: endDate },
      },
      include: {
        recipe: { select: { id: true, name: true, imageUrl: true, estimatedCost: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Group by date
    const calendar: Record<string, any[]> = {};

    for (const meal of meals) {
      const dateKey = meal.scheduledAt.toISOString().split('T')[0];
      if (!calendar[dateKey]) calendar[dateKey] = [];

      calendar[dateKey].push({
        id: meal.id,
        title: meal.recipe?.name ?? meal.customMealName ?? 'Custom Meal',
        mealType: meal.mealType,
        status: meal.status,
        servings: meal.servings,
        scheduledAt: meal.scheduledAt,
        recipe: meal.recipe,
        user: meal.user,
        notes: meal.notes,
      });
    }

    return {
      year,
      month,
      familyId,
      totalMeals: meals.length,
      calendar,
    };
  }
}
