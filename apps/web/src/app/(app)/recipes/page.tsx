'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Search,
  Clock,
  Users,
  DollarSign,
  Flame,
  X,
  Leaf,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { recipesApi } from '@/lib/api/endpoints';
import { formatCurrency } from '@/lib/utils/format';
import { CUISINE_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeIngredient {
  ingredient: { name: string };
  quantity: number;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  cuisine?: string;
  isVegetarian: boolean;
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty?: string;
  estimatedCost?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  tags?: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_GRADIENTS = [
  'from-orange-400 to-rose-500',
  'from-emerald-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-purple-500',
  'from-pink-400 to-rose-500',
];

const CUISINE_EMOJI: Record<string, string> = {
  NORTH_INDIAN: '🍛',
  SOUTH_INDIAN: '🍜',
  MUGHLAI: '🥘',
  PUNJABI: '🍛',
  BENGALI: '🐟',
  GUJARATI: '🥗',
  RAJASTHANI: '🫕',
  MAHARASHTRIAN: '🌶️',
  KERALA: '🥥',
  CHINESE: '🥡',
  CONTINENTAL: '🥩',
};

const getCuisineEmoji = (cuisine?: string) =>
  cuisine ? (CUISINE_EMOJI[cuisine] ?? '🍱') : '🍱';

const getCuisineLabel = (cuisine?: string) =>
  CUISINE_TYPES.find((c) => c.value === cuisine)?.label ?? cuisine ?? '';

type FilterKey = 'all' | 'vegetarian' | 'nonveg' | 'quick' | 'highprotein' | 'northindian' | 'southindian';

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'vegetarian', label: '🌱 Vegetarian' },
  { key: 'nonveg', label: '🍖 Non-Veg' },
  { key: 'quick', label: '⚡ Quick (≤30 min)' },
  { key: 'highprotein', label: '💪 High Protein (≥20g)' },
  { key: 'northindian', label: '🍛 North Indian' },
  { key: 'southindian', label: '🍜 South Indian' },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function NutritionTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur border border-gray-100 rounded-xl shadow-lg px-3 py-2">
      <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-xs text-gray-600">
          {p.value}g
        </p>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RecipeCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[200px] h-[280px] rounded-2xl overflow-hidden animate-shimmer" />
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="skeleton h-5 w-40" />
        <div className="skeleton h-4 w-16" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <RecipeCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  index,
  onClick,
}: {
  recipe: Recipe;
  index: number;
  onClick: () => void;
}) {
  const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  const emoji = getCuisineEmoji(recipe.cuisine);
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, boxShadow: '0 20px 40px rgba(0,0,0,0.18)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'flex-shrink-0 w-[200px] h-[280px] rounded-2xl overflow-hidden cursor-pointer relative text-left',
        `bg-gradient-to-br ${gradient}`
      )}
    >
      {/* Vegetarian indicator */}
      <div className="absolute top-3 right-3 z-10">
        <span
          className={cn(
            'w-3 h-3 rounded-full block ring-2 ring-white/60',
            recipe.isVegetarian ? 'bg-green-400' : 'bg-red-400'
          )}
        />
      </div>

      {/* Emoji */}
      <div className="px-5 pt-8 pb-3">
        <span className="text-5xl leading-none select-none">{emoji}</span>
      </div>

      {/* Name */}
      <div className="px-5 flex-1">
        <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-sm">
          {recipe.name}
        </h3>
        {recipe.cuisine && (
          <p className="text-white/70 text-xs mt-1 font-medium">
            {getCuisineLabel(recipe.cuisine)}
          </p>
        )}
      </div>

      {/* Bottom strip */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
        <span className="flex items-center gap-1 text-white/90 text-xs font-medium">
          <Clock className="w-3 h-3" />
          {totalTime}m
        </span>
        {recipe.difficulty && (
          <span className="text-white/80 text-xs font-medium">
            {recipe.difficulty}
          </span>
        )}
        <span className={cn('w-2 h-2 rounded-full', recipe.isVegetarian ? 'bg-green-400' : 'bg-red-400')} />
      </div>
    </motion.button>
  );
}

// ─── Horizontal Section ───────────────────────────────────────────────────────

function RecipeSection({
  title,
  recipes,
  onCardClick,
}: {
  title: string;
  recipes: Recipe[];
  onCardClick: (r: Recipe) => void;
}) {
  if (recipes.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="section-title">{title}</h2>
        <button className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
          See all <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div
        className="flex gap-4 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {recipes.map((recipe, i) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            index={i}
            onClick={() => onCardClick(recipe)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Recipe Detail Modal ──────────────────────────────────────────────────────

function RecipeDetailModal({
  recipe,
  open,
  onClose,
}: {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!recipe) return null;

  const gradient = CARD_GRADIENTS[recipe.id.charCodeAt(0) % CARD_GRADIENTS.length];
  const emoji = getCuisineEmoji(recipe.cuisine);
  const totalTime = recipe.prepTimeMinutes + recipe.cookTimeMinutes;

  const nutritionData = [
    { name: 'Protein', value: recipe.protein ?? 0, fill: '#10b981' },
    { name: 'Carbs', value: recipe.carbs ?? 0, fill: '#3b82f6' },
    { name: 'Fat', value: recipe.fat ?? 0, fill: '#f59e0b' },
    { name: 'Fiber', value: recipe.fiber ?? 0, fill: '#8b5cf6' },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
              {/* Left Panel */}
              <div
                className={cn(
                  'flex flex-col p-8 text-white relative md:w-[40%] flex-shrink-0',
                  `bg-gradient-to-br ${gradient}`
                )}
              >
                {/* Close button (mobile) */}
                <Dialog.Close asChild>
                  <button className="absolute top-4 right-4 md:hidden w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </Dialog.Close>

                <div className="text-7xl mb-4 select-none">{emoji}</div>
                <h2 className="text-xl font-bold leading-tight mb-4 drop-shadow-sm">
                  {recipe.name}
                </h2>

                {/* Quick stats */}
                <div className="space-y-2.5 mb-6">
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{totalTime} min total</span>
                  </div>
                  <div className="flex items-center gap-2 text-white/90 text-sm">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>{recipe.servings} servings</span>
                  </div>
                  {recipe.estimatedCost != null && (
                    <div className="flex items-center gap-2 text-white/90 text-sm">
                      <DollarSign className="w-4 h-4 flex-shrink-0" />
                      <span>{formatCurrency(recipe.estimatedCost)}</span>
                    </div>
                  )}
                  {recipe.calories != null && (
                    <div className="flex items-center gap-2 text-white/90 text-sm">
                      <Flame className="w-4 h-4 flex-shrink-0" />
                      <span>{recipe.calories} kcal</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-white/20 text-white/90 text-xs font-medium backdrop-blur-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Panel */}
              <div className="flex flex-col flex-1 min-w-0 max-h-[90vh] md:max-h-none">
                {/* Header with close (desktop) */}
                <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
                  <span
                    className={cn(
                      'badge',
                      recipe.isVegetarian ? 'badge-green' : 'badge-red'
                    )}
                  >
                    {recipe.isVegetarian ? (
                      <><Leaf className="w-3 h-3" /> Vegetarian</>
                    ) : (
                      '🍖 Non-Veg'
                    )}
                  </span>
                  <Dialog.Close asChild>
                    <button className="hidden md:flex w-8 h-8 rounded-full bg-gray-100 items-center justify-center hover:bg-gray-200 transition-colors">
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Tabs */}
                <Tabs.Root
                  value={activeTab}
                  onValueChange={setActiveTab}
                  className="flex flex-col flex-1 min-h-0"
                >
                  <Tabs.List className="flex gap-0 px-6 border-b border-gray-100">
                    {(['overview', 'ingredients', 'instructions', 'nutrition'] as const).map((tab) => (
                      <Tabs.Trigger
                        key={tab}
                        value={tab}
                        className={cn(
                          'px-3 py-3 text-xs font-semibold capitalize tracking-tight border-b-2 transition-all duration-150 -mb-px',
                          activeTab === tab
                            ? 'border-emerald-500 text-emerald-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        )}
                      >
                        {tab}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>

                  <div className="flex-1 overflow-y-auto">
                    {/* Overview */}
                    <Tabs.Content value="overview" className="p-6 space-y-4">
                      {recipe.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">{recipe.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {recipe.cuisine && (
                          <span className="badge badge-blue">{getCuisineLabel(recipe.cuisine)}</span>
                        )}
                        {recipe.difficulty && (
                          <span className="badge badge-gray">{recipe.difficulty}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="card p-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Prep Time</p>
                          <p className="font-bold text-gray-900">{recipe.prepTimeMinutes}m</p>
                        </div>
                        <div className="card p-4 text-center">
                          <p className="text-xs text-gray-500 mb-1">Cook Time</p>
                          <p className="font-bold text-gray-900">{recipe.cookTimeMinutes}m</p>
                        </div>
                      </div>
                    </Tabs.Content>

                    {/* Ingredients */}
                    <Tabs.Content value="ingredients" className="p-6">
                      {recipe.ingredients.length === 0 ? (
                        <p className="text-sm text-gray-400">No ingredients listed.</p>
                      ) : (
                        <ul className="space-y-2">
                          {recipe.ingredients.map((ing, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-800">
                                  {ing.ingredient?.name ?? '—'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                                {ing.quantity} {ing.unit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Tabs.Content>

                    {/* Instructions */}
                    <Tabs.Content value="instructions" className="p-6">
                      {recipe.instructions.length === 0 ? (
                        <p className="text-sm text-gray-400">No instructions listed.</p>
                      ) : (
                        <ol className="space-y-3">
                          {recipe.instructions.map((step, i) => (
                            <li
                              key={i}
                              className="card p-4 flex gap-3"
                            >
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </Tabs.Content>

                    {/* Nutrition */}
                    <Tabs.Content value="nutrition" className="p-6">
                      {nutritionData.every((d) => d.value === 0) ? (
                        <p className="text-sm text-gray-400">No nutrition data available.</p>
                      ) : (
                        <div className="space-y-4">
                          {recipe.calories != null && (
                            <div className="card p-4 text-center">
                              <p className="text-xs text-gray-500">Calories per serving</p>
                              <p className="text-3xl font-bold text-gray-900 mt-1">{recipe.calories}</p>
                              <p className="text-xs text-gray-400">kcal</p>
                            </div>
                          )}
                          <ResponsiveContainer width="100%" height={200}>
                            <BarChart
                              data={nutritionData}
                              layout="vertical"
                              margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f1f5f9"
                                horizontal={false}
                              />
                              <XAxis
                                type="number"
                                stroke="#94a3b8"
                                fontSize={11}
                                unit="g"
                                tickLine={false}
                                axisLine={false}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                width={52}
                              />
                              <Tooltip content={<NutritionTooltip />} />
                              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                                {nutritionData.map((entry, i) => (
                                  <Cell key={i} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </Tabs.Content>
                  </div>
                </Tabs.Root>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3 flex-shrink-0">
                  <Dialog.Close asChild>
                    <button className="btn btn-outline btn-md">Close</button>
                  </Dialog.Close>
                  <button className="btn btn-primary btn-md">
                    Add to Meal Plan
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecipesPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['recipes-all'],
    queryFn: () =>
      recipesApi
        .list({ limit: 50 })
        .then((r) => (r.data.data?.items ?? r.data.data ?? []) as Recipe[]),
    staleTime: 60_000,
  });

  const allRecipes: Recipe[] = data ?? [];

  // Filter by search + pill
  const filtered = useMemo(() => {
    let result = allRecipes;

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.cuisine?.toLowerCase().includes(q)
      );
    }

    // Pill filter
    switch (activeFilter) {
      case 'vegetarian':
        result = result.filter((r) => r.isVegetarian);
        break;
      case 'nonveg':
        result = result.filter((r) => !r.isVegetarian);
        break;
      case 'quick':
        result = result.filter(
          (r) => r.prepTimeMinutes + r.cookTimeMinutes <= 30
        );
        break;
      case 'highprotein':
        result = result.filter((r) => (r.protein ?? 0) >= 20);
        break;
      case 'northindian':
        result = result.filter((r) => r.cuisine === 'NORTH_INDIAN');
        break;
      case 'southindian':
        result = result.filter((r) => r.cuisine === 'SOUTH_INDIAN');
        break;
    }

    return result;
  }, [allRecipes, search, activeFilter]);

  // Sections (only shown when no search/filter is active)
  const isFiltering = search.trim() !== '' || activeFilter !== 'all';

  const sections = useMemo(() => {
    if (isFiltering) return [];
    return [
      { title: 'For You', recipes: allRecipes.slice(0, 6) },
      {
        title: 'Vegetarian Picks',
        recipes: allRecipes.filter((r) => r.isVegetarian).slice(0, 8),
      },
      {
        title: 'North Indian Classics',
        recipes: allRecipes
          .filter((r) => r.cuisine === 'NORTH_INDIAN')
          .slice(0, 8),
      },
      {
        title: 'Quick Meals',
        recipes: allRecipes
          .filter((r) => r.prepTimeMinutes + r.cookTimeMinutes <= 45)
          .slice(0, 8),
      },
      {
        title: 'High Protein',
        recipes: allRecipes.filter((r) => (r.protein ?? 0) >= 15).slice(0, 8),
      },
    ].filter((s) => s.recipes.length > 0);
  }, [allRecipes, isFiltering]);

  function openRecipe(recipe: Recipe) {
    setSelectedRecipe(recipe);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Recipes" description="Discover dishes your family will love" />

      <div className="p-6 max-w-7xl mx-auto space-y-8">
        {/* Search + Filter Bar */}
        <div className="space-y-3">
          {/* Search Input */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes, cuisines..."
              className="input pl-10"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.key}
                onClick={() => setActiveFilter(pill.key)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border',
                  activeFilter === pill.key
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                )}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-10">
            {[1, 2, 3].map((i) => (
              <SectionSkeleton key={i} />
            ))}
          </div>
        ) : isFiltering ? (
          /* Filtered Grid */
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {filtered.length} recipe{filtered.length !== 1 ? 's' : ''} found
            </p>
            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-lg font-semibold text-gray-700">No recipes found</p>
                <p className="text-sm text-gray-400 mt-1">Try a different search or filter</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {filtered.map((recipe, i) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    index={i}
                    onClick={() => openRecipe(recipe)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Netflix-style Sections */
          <div className="space-y-10">
            {sections.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-5xl mb-4">🍳</p>
                <p className="text-lg font-semibold text-gray-700">No recipes yet</p>
                <p className="text-sm text-gray-400 mt-1">Add your first recipe to get started</p>
              </div>
            ) : (
              sections.map((section) => (
                <RecipeSection
                  key={section.title}
                  title={section.title}
                  recipes={section.recipes}
                  onCardClick={openRecipe}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {modalOpen && (
          <RecipeDetailModal
            recipe={selectedRecipe}
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setSelectedRecipe(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
