'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { recipesApi } from '@/lib/api/endpoints';
import { formatCurrency } from '@/lib/utils/format';
import { CUISINE_TYPES, UNITS } from '@/lib/constants';
import { Plus, X, Search, Clock, Users, ChefHat, Leaf, Sparkles } from 'lucide-react';

interface RecipeIngredient {
  ingredientName: string;
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
  tags?: string[];
  ingredients: RecipeIngredient[];
  instructions: string[];
}

interface AddRecipeForm {
  name: string;
  description: string;
  cuisine: string;
  isVegetarian: boolean;
  servings: string;
  prepTimeMinutes: string;
  cookTimeMinutes: string;
  difficulty: string;
  estimatedCost: string;
  ingredients: { ingredientName: string; quantity: string; unit: string }[];
  instructions: string[];
  tags: string;
}

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const defaultIngredient = () => ({ ingredientName: '', quantity: '', unit: 'KG' });

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-24 bg-gray-100 rounded mb-4" />
          <div className="flex gap-2 mb-4">
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
          </div>
          <div className="h-8 w-full bg-gray-100 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function RecipeDetailModal({
  recipe,
  onClose,
}: {
  recipe: Recipe;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{recipe.name}</h2>
            {recipe.description && <p className="text-sm text-gray-500 mt-0.5">{recipe.description}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-4 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-3">
            {recipe.isVegetarian ? (
              <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Vegetarian
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Non-Veg
              </span>
            )}
            {recipe.cuisine && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                {CUISINE_TYPES.find((c) => c.value === recipe.cuisine)?.label || recipe.cuisine}
              </span>
            )}
            {recipe.difficulty && (
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                {recipe.difficulty}
              </span>
            )}
            {recipe.estimatedCost != null && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                {formatCurrency(recipe.estimatedCost)}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Prep: {recipe.prepTimeMinutes}m
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Cook: {recipe.cookTimeMinutes}m
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {recipe.servings} servings
            </span>
          </div>

          {/* Tags */}
          {recipe.tags && recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {recipe.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Ingredients</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                  {ing.ingredientName} — {ing.quantity} {ing.unit}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          {recipe.instructions && recipe.instructions.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
              <ol className="space-y-2">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecipesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterVeg, setFilterVeg] = useState<boolean | null>(null);
  const [filterCuisine, setFilterCuisine] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [suggestIngredients, setSuggestIngredients] = useState<string[]>(['']);
  const [addForm, setAddForm] = useState<AddRecipeForm>({
    name: '',
    description: '',
    cuisine: '',
    isVegetarian: true,
    servings: '2',
    prepTimeMinutes: '15',
    cookTimeMinutes: '30',
    difficulty: 'MEDIUM',
    estimatedCost: '',
    ingredients: [defaultIngredient()],
    instructions: [''],
    tags: '',
  });

  const { data: recipesData, isLoading } = useQuery({
    queryKey: ['recipes', search, filterVeg, filterCuisine],
    queryFn: () =>
      recipesApi
        .list({
          search: search || undefined,
          isVegetarian: filterVeg != null ? filterVeg : undefined,
          cuisine: filterCuisine || undefined,
        })
        .then((r) => r.data.data),
    staleTime: 30000,
  });

  const { data: suggestedData, isLoading: suggestLoading } = useQuery({
    queryKey: ['recipes-suggest', suggestIngredients.filter(Boolean)],
    queryFn: () =>
      recipesApi
        .suggest(suggestIngredients.filter(Boolean))
        .then((r) => r.data.data),
    enabled: showSuggestModal && suggestIngredients.filter(Boolean).length > 0,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => recipesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      setShowAddModal(false);
      setAddForm({
        name: '',
        description: '',
        cuisine: '',
        isVegetarian: true,
        servings: '2',
        prepTimeMinutes: '15',
        cookTimeMinutes: '30',
        difficulty: 'MEDIUM',
        estimatedCost: '',
        ingredients: [defaultIngredient()],
        instructions: [''],
        tags: '',
      });
    },
  });

  function handleCreateRecipe() {
    if (!addForm.name.trim()) return;
    createMutation.mutate({
      name: addForm.name,
      description: addForm.description || undefined,
      cuisine: addForm.cuisine || undefined,
      isVegetarian: addForm.isVegetarian,
      servings: parseInt(addForm.servings) || 2,
      prepTimeMinutes: parseInt(addForm.prepTimeMinutes) || 0,
      cookTimeMinutes: parseInt(addForm.cookTimeMinutes) || 0,
      difficulty: addForm.difficulty || undefined,
      estimatedCost: addForm.estimatedCost ? parseFloat(addForm.estimatedCost) : undefined,
      ingredients: addForm.ingredients
        .filter((i) => i.ingredientName.trim())
        .map((i) => ({ ...i, quantity: parseFloat(i.quantity) || 0 })),
      instructions: addForm.instructions.filter((s) => s.trim()),
      tags: addForm.tags
        ? addForm.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
    });
  }

  function updateIngredient(index: number, field: keyof (typeof addForm.ingredients)[0], value: string) {
    setAddForm((p) => {
      const updated = [...p.ingredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...p, ingredients: updated };
    });
  }

  function addIngredient() {
    setAddForm((p) => ({ ...p, ingredients: [...p.ingredients, defaultIngredient()] }));
  }

  function removeIngredient(index: number) {
    setAddForm((p) => ({ ...p, ingredients: p.ingredients.filter((_, i) => i !== index) }));
  }

  function updateInstruction(index: number, value: string) {
    setAddForm((p) => {
      const updated = [...p.instructions];
      updated[index] = value;
      return { ...p, instructions: updated };
    });
  }

  function addInstruction() {
    setAddForm((p) => ({ ...p, instructions: [...p.instructions, ''] }));
  }

  function removeInstruction(index: number) {
    setAddForm((p) => ({ ...p, instructions: p.instructions.filter((_, i) => i !== index) }));
  }

  const recipes: Recipe[] = recipesData || [];
  const suggestedRecipes: Recipe[] = suggestedData || [];

  return (
    <div>
      <Header title="Recipes" description="Browse and manage your recipe collection" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Recipe
          </button>
          <button
            onClick={() => setShowSuggestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Find by Ingredients
          </button>

          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recipes..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <select
            value={filterCuisine}
            onChange={(e) => setFilterCuisine(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">All Cuisines</option>
            {CUISINE_TYPES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilterVeg(null)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterVeg === null ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterVeg(true)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterVeg === true ? 'bg-white shadow-sm font-medium text-green-700' : 'text-gray-500'
              }`}
            >
              <Leaf className="w-3 h-3 inline mr-1" />
              Veg
            </button>
            <button
              onClick={() => setFilterVeg(false)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                filterVeg === false ? 'bg-white shadow-sm font-medium text-red-700' : 'text-gray-500'
              }`}
            >
              Non-Veg
            </button>
          </div>
        </div>

        {/* Recipe Grid */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : recipes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🍳</div>
            <p className="text-lg font-medium text-gray-500">No recipes found</p>
            <p className="text-sm mt-1">Add your first recipe or adjust your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-gray-900 leading-snug">{recipe.name}</h3>
                    <span
                      className={`flex-shrink-0 w-3 h-3 rounded-full mt-1 ${
                        recipe.isVegetarian ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      title={recipe.isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
                    />
                  </div>
                  {recipe.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{recipe.description}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {recipe.cuisine && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {CUISINE_TYPES.find((c) => c.value === recipe.cuisine)?.label || recipe.cuisine}
                    </span>
                  )}
                  {recipe.difficulty && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {recipe.difficulty}
                    </span>
                  )}
                  {recipe.estimatedCost != null && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                      {formatCurrency(recipe.estimatedCost)}
                    </span>
                  )}
                </div>

                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {recipe.prepTimeMinutes + recipe.cookTimeMinutes}m total
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {recipe.servings} servings
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // "Suggest to Meals" - could open meal planner with this recipe pre-filled
                    // For now, just navigate concept
                  }}
                  className="mt-auto px-3 py-1.5 border border-green-200 text-green-700 text-xs rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-1 w-fit"
                >
                  <ChefHat className="w-3 h-3" />
                  Suggest to Meals
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
      )}

      {/* Add Recipe Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Add New Recipe</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Info</h3>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Recipe name *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <textarea
                  value={addForm.description}
                  onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={addForm.cuisine}
                    onChange={(e) => setAddForm((p) => ({ ...p, cuisine: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">Select cuisine</option>
                    {CUISINE_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg">
                    <div
                      onClick={() => setAddForm((p) => ({ ...p, isVegetarian: !p.isVegetarian }))}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        addForm.isVegetarian ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                          addForm.isVegetarian ? 'left-5' : 'left-0.5'
                        }`}
                      />
                    </div>
                    <span className="text-sm text-gray-700">Vegetarian</span>
                  </label>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Details</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Servings</label>
                    <input
                      type="number"
                      value={addForm.servings}
                      onChange={(e) => setAddForm((p) => ({ ...p, servings: e.target.value }))}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prep (min)</label>
                    <input
                      type="number"
                      value={addForm.prepTimeMinutes}
                      onChange={(e) => setAddForm((p) => ({ ...p, prepTimeMinutes: e.target.value }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cook (min)</label>
                    <input
                      type="number"
                      value={addForm.cookTimeMinutes}
                      onChange={(e) => setAddForm((p) => ({ ...p, cookTimeMinutes: e.target.value }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Cost (₹)</label>
                    <input
                      type="number"
                      value={addForm.estimatedCost}
                      onChange={(e) => setAddForm((p) => ({ ...p, estimatedCost: e.target.value }))}
                      min="0"
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Difficulty</label>
                  <div className="flex gap-2">
                    {DIFFICULTIES.map((d) => (
                      <button
                        key={d}
                        onClick={() => setAddForm((p) => ({ ...p, difficulty: d }))}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          addForm.difficulty === d
                            ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={addForm.tags}
                    onChange={(e) => setAddForm((p) => ({ ...p, tags: e.target.value }))}
                    placeholder="e.g., quick, healthy, comfort food"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ingredients</h3>
                  <button onClick={addIngredient} className="text-xs text-green-600 hover:text-green-700 font-medium">
                    + Add
                  </button>
                </div>
                {addForm.ingredients.map((ing, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={ing.ingredientName}
                      onChange={(e) => updateIngredient(i, 'ingredientName', e.target.value)}
                      placeholder="Ingredient name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <input
                      type="number"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(i, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                    <select
                      value={ing.unit}
                      onChange={(e) => updateIngredient(i, 'unit', e.target.value)}
                      className="px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.value}
                        </option>
                      ))}
                    </select>
                    {addForm.ingredients.length > 1 && (
                      <button onClick={() => removeIngredient(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Instructions</h3>
                  <button onClick={addInstruction} className="text-xs text-green-600 hover:text-green-700 font-medium">
                    + Add Step
                  </button>
                </div>
                {addForm.instructions.map((step, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-2">
                      {i + 1}
                    </span>
                    <textarea
                      value={step}
                      onChange={(e) => updateInstruction(i, e.target.value)}
                      placeholder={`Step ${i + 1}...`}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
                    />
                    {addForm.instructions.length > 1 && (
                      <button
                        onClick={() => removeInstruction(i)}
                        className="text-gray-300 hover:text-red-400 transition-colors mt-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleCreateRecipe}
                disabled={!addForm.name.trim() || createMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Recipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggest by Ingredients Modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Find Recipes by Ingredients</h2>
              <button onClick={() => setShowSuggestModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">Enter ingredients you have available:</p>
              {suggestIngredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={ing}
                    onChange={(e) => {
                      const updated = [...suggestIngredients];
                      updated[i] = e.target.value;
                      setSuggestIngredients(updated);
                    }}
                    placeholder={`Ingredient ${i + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  />
                  {suggestIngredients.length > 1 && (
                    <button
                      onClick={() => setSuggestIngredients((p) => p.filter((_, j) => j !== i))}
                      className="text-gray-300 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setSuggestIngredients((p) => [...p, ''])}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                + Add ingredient
              </button>

              {/* Suggested results */}
              {suggestLoading && (
                <div className="space-y-2 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-gray-100 rounded-lg" />
                  ))}
                </div>
              )}
              {suggestedRecipes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{suggestedRecipes.length} recipes found:</p>
                  {suggestedRecipes.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => {
                        setSelectedRecipe(r);
                        setShowSuggestModal(false);
                      }}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">
                          {r.prepTimeMinutes + r.cookTimeMinutes}m | {r.servings} servings
                        </p>
                      </div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${r.isVegetarian ? 'bg-green-500' : 'bg-red-500'}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowSuggestModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
