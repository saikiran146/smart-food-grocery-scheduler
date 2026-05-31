import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';
import { addDays } from 'date-fns';

interface CacheEntry {
  data: any;
  timestamp: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.client = new Anthropic({
      apiKey: this.configService.get<string>('ai.anthropicApiKey'),
    });
  }

  private getCached(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) return entry.data;
    return null;
  }

  private setCache(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private parseJsonResponse(text: string): any {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  }

  private async callClaude(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.configService.get<string>('ai.model', 'claude-sonnet-4-6'),
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });
    return (response.content[0] as any).text;
  }

  async getSuggestions(familyId: string) {
    const cacheKey = `suggestions:${familyId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const [expiringItems, plannedMeals, wasteLogs] = await Promise.all([
        this.prisma.groceryItem.findMany({
          where: { familyId, isActive: true, expiryDate: { lte: addDays(new Date(), 3) } },
          select: { name: true, quantity: true, unit: true, expiryDate: true },
          take: 10,
        }),
        this.prisma.mealSchedule.findMany({
          where: { familyId, status: 'PLANNED', scheduledAt: { gte: new Date() } },
          include: { recipe: { select: { name: true } } },
          take: 10,
        }),
        this.prisma.wasteLog.findMany({
          where: { familyId, wastedAt: { gte: addDays(new Date(), -30) } },
          orderBy: { costWasted: 'desc' },
          take: 5,
        }),
      ]);

      const context = {
        expiringItems: expiringItems.map((i) => ({
          name: i.name, quantity: i.quantity, unit: i.unit,
          daysLeft: Math.ceil((i.expiryDate!.getTime() - Date.now()) / 86400000),
        })),
        plannedMeals: plannedMeals.map((m) => m.recipe?.name ?? m.customMealName),
        recentWaste: wasteLogs.map((w) => ({ item: w.itemName, cost: w.costWasted, reason: w.wasteCategory })),
      };

      const response = await this.callClaude(
        'You are a smart food management AI for Indian households. Return ONLY valid JSON arrays with no markdown.',
        `Based on this household data, generate 6-8 actionable suggestions to reduce waste and optimize meal planning:
${JSON.stringify(context, null, 2)}

Return a JSON array where each suggestion has:
- type: one of "EXPIRY_WARNING" | "RECIPE_SUGGESTION" | "SHOPPING_OPTIMIZATION" | "BUDGET_TIP" | "HEALTH_TIP"
- title: short title (max 60 chars)
- message: detailed actionable message (max 200 chars)
- priority: "HIGH" | "MEDIUM" | "LOW"`,
      );

      const suggestions = this.parseJsonResponse(response);
      this.setCache(cacheKey, suggestions);
      return suggestions;
    } catch (error) {
      this.logger.error('AI suggestions failed', error);
      return [
        { type: 'EXPIRY_WARNING', title: 'Check expiring items', message: 'Review your inventory for items expiring soon and use them first.', priority: 'HIGH' },
        { type: 'SHOPPING_OPTIMIZATION', title: 'Plan before shopping', message: 'Check your meal plan and existing inventory before creating a shopping list.', priority: 'MEDIUM' },
        { type: 'HEALTH_TIP', title: 'Add seasonal vegetables', message: 'Seasonal vegetables are fresher and more affordable.', priority: 'LOW' },
      ];
    }
  }

  async getRecipeRecommendations(familyId: string) {
    const cacheKey = `recipes:${familyId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const [inventory, recipes] = await Promise.all([
        this.prisma.groceryItem.findMany({
          where: { familyId, isActive: true },
          select: { name: true, quantity: true, unit: true, expiryDate: true, category: true },
        }),
        this.prisma.recipe.findMany({
          include: { ingredients: { include: { ingredient: true } } },
          take: 50,
        }),
      ]);

      const expiringItems = inventory.filter(
        (i) => i.expiryDate && i.expiryDate <= addDays(new Date(), 3),
      );

      const response = await this.callClaude(
        'You are an Indian recipe recommendation AI. Return ONLY valid JSON arrays.',
        `Match these available ingredients to recipes, prioritizing expiring items:

Available ingredients: ${JSON.stringify(inventory.map((i) => ({ name: i.name, category: i.category })))}
Expiring soon: ${JSON.stringify(expiringItems.map((i) => i.name))}
Available recipes: ${JSON.stringify(recipes.map((r) => ({ id: r.id, name: r.name, isVegetarian: r.isVegetarian, ingredients: r.ingredients.map((ri) => ri.ingredient.name) })))}

Return top 6 recipe recommendations as JSON array with fields:
- recipeId: string (from available recipes list)
- recipeName: string
- matchScore: number (0-100, how well ingredients match)
- usesExpiringIngredients: boolean
- estimatedCost: number (in INR)
- matchedIngredients: string[] (ingredients user has)
- missingIngredients: string[] (needs to buy)
- reason: string (why recommend this recipe, max 100 chars)`,
      );

      const recommendations = this.parseJsonResponse(response);
      this.setCache(cacheKey, recommendations);
      return recommendations;
    } catch (error) {
      this.logger.error('Recipe recommendations failed', error);
      return [];
    }
  }

  async getGroceryForecast(familyId: string, period: 7 | 15 | 30) {
    const cacheKey = `forecast:${familyId}:${period}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const [transactions, plannedMeals, inventory] = await Promise.all([
        this.prisma.groceryTransaction.findMany({
          where: {
            groceryItem: { familyId },
            type: 'CONSUMPTION',
            performedAt: { gte: addDays(new Date(), -30) },
          },
          include: { groceryItem: { select: { name: true, category: true, unit: true } } },
        }),
        this.prisma.mealSchedule.findMany({
          where: {
            familyId,
            status: 'PLANNED',
            scheduledAt: { gte: new Date(), lte: addDays(new Date(), period) },
          },
          include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
        }),
        this.prisma.groceryItem.findMany({
          where: { familyId, isActive: true },
          select: { name: true, quantity: true, unit: true, category: true },
        }),
      ]);

      const response = await this.callClaude(
        'You are a grocery forecasting AI for Indian households. Return ONLY valid JSON.',
        `Predict grocery needs for the next ${period} days:

Past 30-day consumption: ${JSON.stringify(transactions.map((t) => ({ item: t.groceryItem.name, qty: t.quantity, unit: t.groceryItem.unit })).slice(0, 30))}
Planned meals: ${JSON.stringify(plannedMeals.map((m) => m.recipe?.name ?? m.customMealName))}
Current inventory: ${JSON.stringify(inventory.map((i) => ({ name: i.name, qty: i.quantity, unit: i.unit })))}

Return JSON object with:
- period: "${period}_DAYS"
- items: array of { name, category, predictedQuantity, unit, estimatedCost (INR), reason }
- totalEstimatedCost: number`,
      );

      const forecast = this.parseJsonResponse(response);
      this.setCache(cacheKey, forecast);
      return forecast;
    } catch (error) {
      this.logger.error('Grocery forecast failed', error);
      return { period: `${period}_DAYS`, items: [], totalEstimatedCost: 0 };
    }
  }

  async getWasteReductionTips(familyId: string) {
    const cacheKey = `waste-tips:${familyId}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    try {
      const wasteLogs = await this.prisma.wasteLog.findMany({
        where: { familyId, wastedAt: { gte: addDays(new Date(), -30) } },
        orderBy: { costWasted: 'desc' },
        take: 20,
      });

      const response = await this.callClaude(
        'You are a food waste reduction expert for Indian households. Return ONLY valid JSON arrays.',
        `Analyze these waste logs and provide personalized tips:
${JSON.stringify(wasteLogs.map((w) => ({ item: w.itemName, category: w.category, reason: w.wasteCategory, cost: w.costWasted, qty: w.quantity })))}

Return 5 specific, actionable tips as JSON array with fields:
- title: string (max 60 chars)
- description: string (max 200 chars)
- impact: "HIGH" | "MEDIUM" | "LOW"
- category: string
- actionSteps: string[] (2-3 concrete steps)`,
      );

      const tips = this.parseJsonResponse(response);
      this.setCache(cacheKey, tips);
      return tips;
    } catch (error) {
      this.logger.error('Waste tips failed', error);
      return [
        { title: 'Plan meals before shopping', description: 'Create a weekly meal plan and only buy what you need.', impact: 'HIGH', category: 'Planning', actionSteps: ['Create weekly meal plan', 'Check inventory first', 'Buy exact quantities'] },
        { title: 'Store food properly', description: 'Proper storage extends shelf life significantly.', impact: 'MEDIUM', category: 'Storage', actionSteps: ['Use airtight containers', 'Keep fridge at 3-4°C'] },
        { title: 'Use FIFO method', description: 'First In, First Out — always use older items first.', impact: 'HIGH', category: 'Usage', actionSteps: ['Arrange new purchases at back', 'Check dates before buying'] },
      ];
    }
  }
}
