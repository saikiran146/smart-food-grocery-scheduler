import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto, RecipeIngredientDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeFilterDto } from './dto/recipe-filter.dto';
import { GroceryCategory } from '@prisma/client';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    const { ingredients, ...recipeData } = dto;

    const recipe = await this.prisma.recipe.create({
      data: {
        name: recipeData.name,
        description: recipeData.description,
        cuisine: recipeData.cuisine,
        isVegetarian: recipeData.isVegetarian ?? true,
        servings: recipeData.servings ?? 4,
        prepTimeMinutes: recipeData.prepTimeMinutes ?? 15,
        cookTimeMinutes: recipeData.cookTimeMinutes ?? 30,
        difficulty: recipeData.difficulty ?? 'MEDIUM',
        imageUrl: recipeData.imageUrl,
        instructions: recipeData.instructions as any,
        tags: recipeData.tags ?? [],
        estimatedCost: recipeData.estimatedCost ?? 0,
        calories: recipeData.calories,
        protein: recipeData.protein,
        carbs: recipeData.carbs,
        fat: recipeData.fat,
        fiber: recipeData.fiber,
        isPublic: recipeData.isPublic ?? true,
      },
    });

    if (ingredients && ingredients.length > 0) {
      await this.upsertIngredients(recipe.id, ingredients);
    }

    return this.findOne(recipe.id);
  }

  async findAll(filters: RecipeFilterDto) {
    const { cuisine, isVegetarian, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (cuisine) where.cuisine = cuisine;
    if (isVegetarian !== undefined) where.isVegetarian = isVegetarian;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [recipes, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        skip,
        take: limit,
        include: {
          ingredients: {
            include: {
              ingredient: { select: { id: true, name: true, category: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recipe.count({ where }),
    ]);

    return {
      data: recipes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                category: true,
                defaultUnit: true,
                caloriesPer: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with id ${id} not found`);
    }

    return recipe;
  }

  async update(id: string, dto: UpdateRecipeDto) {
    await this.findOne(id);

    const { ingredients, ...recipeData } = dto;

    await this.prisma.recipe.update({
      where: { id },
      data: {
        ...(recipeData.name !== undefined && { name: recipeData.name }),
        ...(recipeData.description !== undefined && { description: recipeData.description }),
        ...(recipeData.cuisine !== undefined && { cuisine: recipeData.cuisine }),
        ...(recipeData.isVegetarian !== undefined && { isVegetarian: recipeData.isVegetarian }),
        ...(recipeData.servings !== undefined && { servings: recipeData.servings }),
        ...(recipeData.prepTimeMinutes !== undefined && { prepTimeMinutes: recipeData.prepTimeMinutes }),
        ...(recipeData.cookTimeMinutes !== undefined && { cookTimeMinutes: recipeData.cookTimeMinutes }),
        ...(recipeData.difficulty !== undefined && { difficulty: recipeData.difficulty }),
        ...(recipeData.imageUrl !== undefined && { imageUrl: recipeData.imageUrl }),
        ...(recipeData.instructions !== undefined && { instructions: recipeData.instructions as any }),
        ...(recipeData.tags !== undefined && { tags: recipeData.tags }),
        ...(recipeData.estimatedCost !== undefined && { estimatedCost: recipeData.estimatedCost }),
        ...(recipeData.calories !== undefined && { calories: recipeData.calories }),
        ...(recipeData.protein !== undefined && { protein: recipeData.protein }),
        ...(recipeData.carbs !== undefined && { carbs: recipeData.carbs }),
        ...(recipeData.fat !== undefined && { fat: recipeData.fat }),
        ...(recipeData.fiber !== undefined && { fiber: recipeData.fiber }),
        ...(recipeData.isPublic !== undefined && { isPublic: recipeData.isPublic }),
      },
    });

    if (ingredients !== undefined) {
      // Full replacement: delete existing, re-create
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });

      if (ingredients.length > 0) {
        const normalized = ingredients.map((i) => ({
          name: i.name ?? '',
          quantity: i.quantity ?? 0,
          unit: i.unit ?? 'G' as any,
          isOptional: i.isOptional,
          notes: i.notes,
        }));
        await this.upsertIngredients(id, normalized as RecipeIngredientDto[]);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.recipe.delete({ where: { id } });

    return { message: 'Recipe deleted successfully' };
  }

  async suggest(ingredientNames: string[]) {
    if (!ingredientNames || ingredientNames.length === 0) {
      return [];
    }

    // Normalize input names to lowercase for comparison
    const normalized = ingredientNames.map((n) => n.trim().toLowerCase());

    // Fetch recipes with their ingredients
    const recipes = await this.prisma.recipe.findMany({
      include: {
        ingredients: {
          include: {
            ingredient: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Score each recipe by how many of the provided ingredients it uses
    const scored = recipes.map((recipe) => {
      const recipeIngredientNames = recipe.ingredients.map((ri) =>
        ri.ingredient.name.toLowerCase(),
      );

      const matchCount = normalized.filter((name) =>
        recipeIngredientNames.some(
          (riName) => riName.includes(name) || name.includes(riName),
        ),
      ).length;

      return { recipe, matchCount };
    });

    // Filter out recipes with 0 matches, sort descending by matchCount
    const results = scored
      .filter((s) => s.matchCount > 0)
      .sort((a, b) => b.matchCount - a.matchCount)
      .map(({ recipe, matchCount }) => ({
        ...recipe,
        matchCount,
        matchedIngredients: recipe.ingredients
          .filter((ri) =>
            normalized.some(
              (name) =>
                ri.ingredient.name.toLowerCase().includes(name) ||
                name.includes(ri.ingredient.name.toLowerCase()),
            ),
          )
          .map((ri) => ri.ingredient.name),
      }));

    return results;
  }

  private async upsertIngredients(recipeId: string, ingredients: RecipeIngredientDto[]) {
    for (const ing of ingredients) {
      // Upsert ingredient by name
      const ingredient = await this.prisma.ingredient.upsert({
        where: { name: ing.name },
        update: {},
        create: {
          name: ing.name,
          category: GroceryCategory.OTHER,
          defaultUnit: ing.unit,
        },
      });

      await this.prisma.recipeIngredient.upsert({
        where: { recipeId_ingredientId: { recipeId, ingredientId: ingredient.id } },
        update: {
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional ?? false,
          notes: ing.notes,
        },
        create: {
          recipeId,
          ingredientId: ingredient.id,
          quantity: ing.quantity,
          unit: ing.unit,
          isOptional: ing.isOptional ?? false,
          notes: ing.notes,
        },
      });
    }
  }
}
