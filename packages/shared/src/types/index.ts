// ============================================================
// ENUMS
// ============================================================

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
}

export enum MealStatus {
  PLANNED = 'PLANNED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  CHANGED = 'CHANGED',
}

export enum GroceryCategory {
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  RICE = 'RICE',
  PULSES = 'PULSES',
  DAIRY = 'DAIRY',
  MEAT = 'MEAT',
  SPICES = 'SPICES',
  OILS = 'OILS',
  SNACKS = 'SNACKS',
  BEVERAGES = 'BEVERAGES',
  OTHER = 'OTHER',
}

export enum StorageLocation {
  REFRIGERATOR = 'REFRIGERATOR',
  FREEZER = 'FREEZER',
  PANTRY = 'PANTRY',
}

export enum Unit {
  KG = 'KG',
  G = 'G',
  LITER = 'LITER',
  ML = 'ML',
  PIECES = 'PIECES',
  DOZEN = 'DOZEN',
  BUNCH = 'BUNCH',
  PACKET = 'PACKET',
  CAN = 'CAN',
  BOTTLE = 'BOTTLE',
}

export enum WasteCategory {
  EXPIRED = 'EXPIRED',
  SPOILED = 'SPOILED',
  OVERCOOKED = 'OVERCOOKED',
  LEFTOVERS_DISCARDED = 'LEFTOVERS_DISCARDED',
  OTHER = 'OTHER',
}

export enum RipnessLevel {
  UNRIPE = 'UNRIPE',
  SLIGHTLY_RIPE = 'SLIGHTLY_RIPE',
  RIPE = 'RIPE',
  OVERRIPE = 'OVERRIPE',
}

export enum DietaryPreference {
  VEGETARIAN = 'VEGETARIAN',
  NON_VEGETARIAN = 'NON_VEGETARIAN',
  VEGAN = 'VEGAN',
  JAIN = 'JAIN',
  EGGETARIAN = 'EGGETARIAN',
}

export enum RecipeCuisine {
  NORTH_INDIAN = 'NORTH_INDIAN',
  SOUTH_INDIAN = 'SOUTH_INDIAN',
  BENGALI = 'BENGALI',
  GUJARATI = 'GUJARATI',
  RAJASTHANI = 'RAJASTHANI',
  PUNJABI = 'PUNJABI',
  MAHARASHTRIAN = 'MAHARASHTRIAN',
  KERALA = 'KERALA',
  CHINESE = 'CHINESE',
  CONTINENTAL = 'CONTINENTAL',
  OTHER = 'OTHER',
}

export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  MEAL_REMINDER = 'MEAL_REMINDER',
  SHOPPING_REMINDER = 'SHOPPING_REMINDER',
  FRUIT_ALERT = 'FRUIT_ALERT',
  AI_SUGGESTION = 'AI_SUGGESTION',
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================
// AUTH TYPES
// ============================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  familyId?: string;
  iat?: number;
  exp?: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  dietaryPreference?: DietaryPreference;
}

// ============================================================
// USER TYPES
// ============================================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  dietaryPreference: DietaryPreference;
  isEmailVerified: boolean;
  createdAt: string;
  families: FamilySummary[];
}

export interface FamilySummary {
  id: string;
  name: string;
  role: string;
  memberCount: number;
}

// ============================================================
// RECIPE TYPES
// ============================================================

export interface RecipeIngredientDto {
  ingredientId?: string;
  ingredientName: string;
  quantity: number;
  unit: Unit;
  isOptional?: boolean;
  notes?: string;
}

export interface CreateRecipeDto {
  name: string;
  description?: string;
  cuisine: RecipeCuisine;
  isVegetarian: boolean;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  instructions: string[];
  tags: string[];
  estimatedCost?: number;
  ingredients: RecipeIngredientDto[];
}

// ============================================================
// MEAL SCHEDULE TYPES
// ============================================================

export interface CreateMealScheduleDto {
  familyId: string;
  recipeId?: string;
  customMealName?: string;
  mealType: MealType;
  scheduledAt: string;
  servings: number;
  notes?: string;
}

export interface MealScheduleEvent {
  id: string;
  title: string;
  date: string;
  mealType: MealType;
  status: MealStatus;
  servings: number;
  recipe?: {
    id: string;
    name: string;
    imageUrl?: string;
    isVegetarian: boolean;
  };
}

// ============================================================
// GROCERY TYPES
// ============================================================

export interface CreateGroceryItemDto {
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: Unit;
  purchaseDate?: string;
  expiryDate?: string;
  costPerUnit: number;
  storageLocation: StorageLocation;
  brand?: string;
  notes?: string;
}

export interface GroceryShortage {
  ingredientName: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  unit: Unit;
  forMeals: string[];
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface DashboardSummary {
  inventory: InventoryMetrics;
  consumption: ConsumptionMetrics;
  waste: WasteMetrics;
  budget: BudgetMetrics;
}

export interface InventoryMetrics {
  totalItems: number;
  totalValue: number;
  expiringInDays3: number;
  expiringInDays7: number;
  lowStockItems: number;
}

export interface ConsumptionMetrics {
  weeklyUsage: UsageData[];
  monthlyUsage: UsageData[];
  topConsumedItems: { name: string; quantity: number; unit: string }[];
}

export interface WasteMetrics {
  monthlyWastePercent: number;
  totalWasteCost: number;
  mostWastedItems: { name: string; quantity: number; cost: number }[];
  wasteByCategory: { category: string; quantity: number; cost: number }[];
  wasteByReason: { reason: string; count: number; cost: number }[];
}

export interface BudgetMetrics {
  monthlySpend: number;
  budget: number;
  predictedSpend: number;
  savedFromReducedWaste: number;
  spendByCategory: { category: string; amount: number }[];
}

export interface UsageData {
  label: string;
  quantity: number;
  cost: number;
}

// ============================================================
// AI TYPES
// ============================================================

export interface RecipeRecommendation {
  recipeId?: string;
  recipeName: string;
  matchScore: number;
  usesExpiringIngredients: boolean;
  estimatedCost: number;
  ingredients: string[];
  reason: string;
}

export interface AISuggestion {
  type: 'EXPIRY_WARNING' | 'RECIPE_SUGGESTION' | 'SHOPPING_OPTIMIZATION' | 'BUDGET_TIP' | 'HEALTH_TIP';
  title: string;
  message: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  actionable?: {
    label: string;
    route: string;
  };
}

export interface GroceryForecast {
  period: '7_DAYS' | '15_DAYS' | '30_DAYS';
  items: {
    name: string;
    predictedQuantity: number;
    unit: Unit;
    estimatedCost: number;
  }[];
  totalEstimatedCost: number;
}
