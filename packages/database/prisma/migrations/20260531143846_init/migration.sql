-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateEnum
CREATE TYPE "MealStatus" AS ENUM ('PLANNED', 'COMPLETED', 'SKIPPED', 'CHANGED');

-- CreateEnum
CREATE TYPE "GroceryCategory" AS ENUM ('VEGETABLES', 'FRUITS', 'RICE', 'PULSES', 'DAIRY', 'MEAT', 'SPICES', 'OILS', 'SNACKS', 'BEVERAGES', 'OTHER');

-- CreateEnum
CREATE TYPE "StorageLocation" AS ENUM ('REFRIGERATOR', 'FREEZER', 'PANTRY');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('KG', 'G', 'LITER', 'ML', 'PIECES', 'DOZEN', 'BUNCH', 'PACKET', 'CAN', 'BOTTLE');

-- CreateEnum
CREATE TYPE "WasteCategory" AS ENUM ('EXPIRED', 'SPOILED', 'OVERCOOKED', 'LEFTOVERS_DISCARDED', 'OTHER');

-- CreateEnum
CREATE TYPE "RipnessLevel" AS ENUM ('UNRIPE', 'SLIGHTLY_RIPE', 'RIPE', 'OVERRIPE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOW_STOCK', 'EXPIRING_SOON', 'EXPIRED', 'MEAL_REMINDER', 'SHOPPING_REMINDER', 'FRUIT_ALERT', 'AI_SUGGESTION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PURCHASE', 'CONSUMPTION', 'WASTE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "DietaryPreference" AS ENUM ('VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'JAIN', 'EGGETARIAN');

-- CreateEnum
CREATE TYPE "RecipeCuisine" AS ENUM ('NORTH_INDIAN', 'SOUTH_INDIAN', 'BENGALI', 'GUJARATI', 'RAJASTHANI', 'PUNJABI', 'MAHARASHTRIAN', 'KERALA', 'CHINESE', 'CONTINENTAL', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "passwordHash" TEXT,
    "googleId" TEXT,
    "dietaryPreference" "DietaryPreference" NOT NULL DEFAULT 'VEGETARIAN',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "nickname" TEXT,
    "birthDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cuisine" "RecipeCuisine" NOT NULL DEFAULT 'NORTH_INDIAN',
    "isVegetarian" BOOLEAN NOT NULL DEFAULT true,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "prepTimeMinutes" INTEGER NOT NULL DEFAULT 15,
    "cookTimeMinutes" INTEGER NOT NULL DEFAULT 30,
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "imageUrl" TEXT,
    "instructions" JSONB NOT NULL,
    "tags" TEXT[],
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calories" DOUBLE PRECISION,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "fiber" DOUBLE PRECISION,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL DEFAULT 'OTHER',
    "defaultUnit" "Unit" NOT NULL DEFAULT 'G',
    "caloriesPer" DOUBLE PRECISION,
    "proteinPer" DOUBLE PRECISION,
    "carbsPer" DOUBLE PRECISION,
    "fatPer" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "ingredientId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_schedules" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipeId" TEXT,
    "mealType" "MealType" NOT NULL,
    "status" "MealStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "customMealName" TEXT,
    "notes" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "actualCost" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_items" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "ingredientId" TEXT,
    "name" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "storageLocation" "StorageLocation" NOT NULL DEFAULT 'PANTRY',
    "brand" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grocery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grocery_transactions" (
    "id" TEXT NOT NULL,
    "groceryItemId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "notes" TEXT,
    "mealScheduleId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grocery_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_lists" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalBudget" DOUBLE PRECISION,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopping_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_items" (
    "id" TEXT NOT NULL,
    "shoppingListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "estimatedCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualCost" DOUBLE PRECISION,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "groceryItemId" TEXT,

    CONSTRAINT "shopping_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_logs" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL,
    "wasteCategory" "WasteCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "Unit" NOT NULL,
    "costWasted" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reason" TEXT,
    "wastedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fruits" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ripnessLevel" "RipnessLevel" NOT NULL DEFAULT 'UNRIPE',
    "expectedRipeDays" INTEGER NOT NULL DEFAULT 3,
    "expiryDate" TIMESTAMP(3),
    "costPerPiece" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fruits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fruit_alerts" (
    "id" TEXT NOT NULL,
    "fruitId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "fruit_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "spentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "families_inviteCode_key" ON "families"("inviteCode");

-- CreateIndex
CREATE INDEX "families_ownerId_idx" ON "families"("ownerId");

-- CreateIndex
CREATE INDEX "families_inviteCode_idx" ON "families"("inviteCode");

-- CreateIndex
CREATE INDEX "family_members_familyId_idx" ON "family_members"("familyId");

-- CreateIndex
CREATE INDEX "family_members_userId_idx" ON "family_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_familyId_userId_key" ON "family_members"("familyId", "userId");

-- CreateIndex
CREATE INDEX "recipes_name_idx" ON "recipes"("name");

-- CreateIndex
CREATE INDEX "recipes_isVegetarian_idx" ON "recipes"("isVegetarian");

-- CreateIndex
CREATE INDEX "recipes_cuisine_idx" ON "recipes"("cuisine");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_name_key" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "ingredients_name_idx" ON "ingredients"("name");

-- CreateIndex
CREATE INDEX "ingredients_category_idx" ON "ingredients"("category");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientId");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");

-- CreateIndex
CREATE INDEX "meal_schedules_familyId_scheduledAt_idx" ON "meal_schedules"("familyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "meal_schedules_userId_idx" ON "meal_schedules"("userId");

-- CreateIndex
CREATE INDEX "meal_schedules_status_idx" ON "meal_schedules"("status");

-- CreateIndex
CREATE INDEX "grocery_items_familyId_idx" ON "grocery_items"("familyId");

-- CreateIndex
CREATE INDEX "grocery_items_category_idx" ON "grocery_items"("category");

-- CreateIndex
CREATE INDEX "grocery_items_expiryDate_idx" ON "grocery_items"("expiryDate");

-- CreateIndex
CREATE INDEX "grocery_items_isActive_idx" ON "grocery_items"("isActive");

-- CreateIndex
CREATE INDEX "grocery_transactions_groceryItemId_idx" ON "grocery_transactions"("groceryItemId");

-- CreateIndex
CREATE INDEX "grocery_transactions_type_idx" ON "grocery_transactions"("type");

-- CreateIndex
CREATE INDEX "grocery_transactions_performedAt_idx" ON "grocery_transactions"("performedAt");

-- CreateIndex
CREATE INDEX "shopping_lists_familyId_idx" ON "shopping_lists"("familyId");

-- CreateIndex
CREATE INDEX "shopping_lists_userId_idx" ON "shopping_lists"("userId");

-- CreateIndex
CREATE INDEX "shopping_items_shoppingListId_idx" ON "shopping_items"("shoppingListId");

-- CreateIndex
CREATE INDEX "waste_logs_familyId_idx" ON "waste_logs"("familyId");

-- CreateIndex
CREATE INDEX "waste_logs_userId_idx" ON "waste_logs"("userId");

-- CreateIndex
CREATE INDEX "waste_logs_wastedAt_idx" ON "waste_logs"("wastedAt");

-- CreateIndex
CREATE INDEX "waste_logs_wasteCategory_idx" ON "waste_logs"("wasteCategory");

-- CreateIndex
CREATE INDEX "fruits_familyId_idx" ON "fruits"("familyId");

-- CreateIndex
CREATE INDEX "fruits_expiryDate_idx" ON "fruits"("expiryDate");

-- CreateIndex
CREATE INDEX "fruit_alerts_fruitId_idx" ON "fruit_alerts"("fruitId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "budgets_familyId_idx" ON "budgets"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_familyId_month_year_key" ON "budgets"("familyId", "month", "year");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "families" ADD CONSTRAINT "families_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_schedules" ADD CONSTRAINT "meal_schedules_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_schedules" ADD CONSTRAINT "meal_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_schedules" ADD CONSTRAINT "meal_schedules_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_items" ADD CONSTRAINT "grocery_items_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grocery_transactions" ADD CONSTRAINT "grocery_transactions_groceryItemId_fkey" FOREIGN KEY ("groceryItemId") REFERENCES "grocery_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_items" ADD CONSTRAINT "shopping_items_shoppingListId_fkey" FOREIGN KEY ("shoppingListId") REFERENCES "shopping_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_logs" ADD CONSTRAINT "waste_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fruits" ADD CONSTRAINT "fruits_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fruit_alerts" ADD CONSTRAINT "fruit_alerts_fruitId_fkey" FOREIGN KEY ("fruitId") REFERENCES "fruits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;
