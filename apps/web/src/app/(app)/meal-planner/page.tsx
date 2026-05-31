'use client';

import { useState, useMemo, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  SkipForward,
  Trash2,
  Calendar,
  LayoutGrid,
  Search,
  Utensils,
} from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isSameDay,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachWeekOfInterval,
  addDays,
} from 'date-fns';
import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import { mealsApi, recipesApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils/cn';
import { MEAL_TYPES } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Meal {
  id: string;
  familyId: string;
  mealType: string;
  date: string;
  status: string;
  servings: number;
  recipe?: { id: string; name: string };
  customMealName?: string;
}

type ViewMode = 'week' | 'month';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  SKIPPED: 'bg-gray-100 text-gray-500 border-gray-200',
  CHANGED: 'bg-orange-100 text-orange-700 border-orange-200',
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonWeek() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-7 gap-2 mb-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-200 rounded" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, ri) => (
        <div key={ri} className="grid grid-cols-7 gap-2 mb-2">
          {Array.from({ length: 7 }).map((_, ci) => (
            <div key={ci} className="h-16 bg-gray-100 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Add/Edit Meal Modal ──────────────────────────────────────────────────────

interface AddMealModalProps {
  open: boolean;
  onClose: () => void;
  prefillDate?: string;
  prefillMealType?: string;
  familyId: string;
}

function AddMealModal({ open, onClose, prefillDate, prefillMealType, familyId }: AddMealModalProps) {
  const qc = useQueryClient();
  const [date, setDate] = useState(prefillDate ?? format(new Date(), 'yyyy-MM-dd'));
  const [mealType, setMealType] = useState(prefillMealType ?? 'BREAKFAST');
  const [servings, setServings] = useState(2);
  const [recipeSearch, setRecipeSearch] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<{ id: string; name: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const { data: recipes } = useQuery({
    queryKey: ['recipes', recipeSearch],
    queryFn: () => recipesApi.list({ search: recipeSearch, familyId }).then((r) => r.data.data as any[]),
    enabled: !useCustom,
  });

  const createMeal = useMutation({
    mutationFn: (data: any) => mealsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMeal.mutate({
      familyId,
      date,
      mealType,
      servings,
      ...(useCustom
        ? { customMealName: customName }
        : selectedRecipe
        ? { recipeId: selectedRecipe.id }
        : {}),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Schedule a Meal</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setMealType(mt.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-sm font-medium transition-colors flex items-center gap-2',
                    mealType === mt.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <span>{mt.emoji}</span> {mt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom vs Recipe toggle */}
          <div>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setUseCustom(false)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  !useCustom ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                Pick Recipe
              </button>
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={cn(
                  'flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  useCustom ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                )}
              >
                Custom Name
              </button>
            </div>

            {useCustom ? (
              <input
                type="text"
                placeholder="e.g. Dal Tadka, Pasta..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required={useCustom}
              />
            ) : (
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {selectedRecipe && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 font-medium">{selectedRecipe.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedRecipe(null)}
                      className="ml-auto text-green-500 hover:text-green-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {recipes && recipes.length > 0 && !selectedRecipe && (
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {recipes.map((recipe: any) => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => setSelectedRecipe({ id: recipe.id, name: recipe.name })}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                      >
                        {recipe.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold"
              >
                -
              </button>
              <span className="text-lg font-bold text-gray-900 w-6 text-center">{servings}</span>
              <button
                type="button"
                onClick={() => setServings(servings + 1)}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold"
              >
                +
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={createMeal.isPending}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {createMeal.isPending ? 'Scheduling...' : 'Schedule Meal'}
          </button>
          {createMeal.isError && (
            <p className="text-xs text-red-500 text-center">Failed to schedule. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Meal Card with action menu ───────────────────────────────────────────────

function MealCard({ meal, onDelete }: { meal: Meal; onDelete: (id: string) => void }) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const completeMeal = useMutation({
    mutationFn: () => mealsApi.complete(meal.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });
  const skipMeal = useMutation({
    mutationFn: () => mealsApi.skip(meal.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const name = meal.recipe?.name ?? meal.customMealName ?? 'Unnamed';

  return (
    <div
      className={cn(
        'relative rounded-lg border p-2 cursor-pointer group',
        STATUS_STYLES[meal.status] ?? 'bg-gray-50 border-gray-200'
      )}
      onClick={() => setMenuOpen((o) => !o)}
    >
      <p className="text-xs font-semibold leading-tight truncate">{name}</p>
      <p className="text-[10px] opacity-70 mt-0.5">{meal.servings} srv</p>

      {menuOpen && (
        <div
          className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-40"
          onClick={(e) => e.stopPropagation()}
        >
          {meal.status !== 'COMPLETED' && (
            <button
              onClick={() => { completeMeal.mutate(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-green-700 hover:bg-green-50 transition-colors"
            >
              <Check className="w-4 h-4" /> Mark Complete
            </button>
          )}
          {meal.status !== 'SKIPPED' && (
            <button
              onClick={() => { skipMeal.mutate(); setMenuOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <SkipForward className="w-4 h-4" /> Skip
            </button>
          )}
          <button
            onClick={() => { onDelete(meal.id); setMenuOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({
  weekStart,
  meals,
  isLoading,
  onAddSlot,
  onDelete,
}: {
  weekStart: Date;
  meals: Meal[];
  isLoading: boolean;
  onAddSlot: (date: string, mealType: string) => void;
  onDelete: (id: string) => void;
}) {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });
  const today = new Date();

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Day headers */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
          <div />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'text-center py-2 rounded-lg text-xs font-semibold',
                isSameDay(day, today)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              <p>{format(day, 'EEE')}</p>
              <p className="text-sm">{format(day, 'd')}</p>
            </div>
          ))}
        </div>

        {/* Rows per meal type */}
        {isLoading ? (
          <SkeletonWeek />
        ) : (
          MEAL_TYPES.map((mt) => (
            <div key={mt.value} className="grid grid-cols-[80px_repeat(7,1fr)] gap-1 mb-1">
              {/* Meal type label */}
              <div className="flex items-center justify-end pr-2">
                <span className="text-xs font-medium text-gray-500 text-right leading-tight">
                  {mt.emoji} {mt.label}
                </span>
              </div>

              {/* Cells */}
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayMeals = meals.filter(
                  (m) => m.mealType === mt.value && (m.date.startsWith(dateStr) || isSameDay(new Date(m.date), day))
                );

                return (
                  <div
                    key={day.toISOString()}
                    className="min-h-[56px] bg-gray-50 rounded-lg p-1 space-y-1"
                  >
                    {dayMeals.map((meal) => (
                      <MealCard key={meal.id} meal={meal} onDelete={onDelete} />
                    ))}
                    <button
                      onClick={() => onAddSlot(dateStr, mt.value)}
                      className="w-full h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 hover:bg-green-50 rounded border border-dashed border-gray-300 hover:border-green-400 transition-all text-gray-400 hover:text-green-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({
  currentDate,
  meals,
  isLoading,
  onDayClick,
}: {
  currentDate: Date;
  meals: Meal[];
  isLoading: boolean;
  onDayClick: (date: string) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
  const today = new Date();

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        weeks.map((weekStart) => {
          const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-7 gap-1 mb-1">
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const dayMeals = meals.filter((m) =>
                  m.date.startsWith(dateStr) || isSameDay(new Date(m.date), day)
                );
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => onDayClick(dateStr)}
                    className={cn(
                      'min-h-[80px] p-1.5 rounded-xl text-left transition-colors border',
                      isCurrentMonth ? 'bg-white border-gray-100 hover:border-green-200' : 'bg-gray-50 border-transparent',
                      isSameDay(day, today) && 'border-green-400 ring-1 ring-green-300'
                    )}
                  >
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        isCurrentMonth ? (isSameDay(day, today) ? 'text-green-600' : 'text-gray-900') : 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayMeals.slice(0, 3).map((meal) => (
                        <div
                          key={meal.id}
                          className={cn(
                            'text-[10px] rounded px-1 py-0.5 truncate font-medium',
                            STATUS_STYLES[meal.status] ?? 'bg-gray-100 text-gray-600'
                          )}
                        >
                          {meal.recipe?.name ?? meal.customMealName ?? 'Meal'}
                        </div>
                      ))}
                      {dayMeals.length > 3 && (
                        <p className="text-[10px] text-gray-400">+{dayMeals.length - 3} more</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MealPlannerPage() {
  const { selectedFamilyId: familyId } = useFamily();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | undefined>();
  const [prefillMealType, setPrefillMealType] = useState<string | undefined>();

  // Week range
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Fetch for week view
  const { data: weekMeals, isLoading: weekLoading } = useQuery({
    queryKey: ['meals', familyId, 'week', format(weekStart, 'yyyy-MM-dd')],
    queryFn: () =>
      mealsApi
        .list({
          familyId,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
        })
        .then((r) => r.data.data as Meal[]),
    enabled: !!familyId && viewMode === 'week',
  });

  // Fetch for month view
  const { data: monthMeals, isLoading: monthLoading } = useQuery({
    queryKey: ['meals-calendar', familyId, currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () =>
      mealsApi
        .getCalendar(familyId!, currentDate.getFullYear(), currentDate.getMonth() + 1)
        .then((r) => r.data.data as Meal[]),
    enabled: !!familyId && viewMode === 'month',
  });

  const deleteMeal = useMutation({
    mutationFn: (id: string) => mealsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const handleAddSlot = (date: string, mealType?: string) => {
    setPrefillDate(date);
    setPrefillMealType(mealType);
    setModalOpen(true);
  };

  const handlePrev = () => {
    if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subMonths(d, 1));
  };
  const handleNext = () => {
    if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addMonths(d, 1));
  };
  const handleToday = () => setCurrentDate(new Date());

  const periodLabel =
    viewMode === 'week'
      ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
      : format(currentDate, 'MMMM yyyy');

  const meals = viewMode === 'week' ? weekMeals ?? [] : monthMeals ?? [];
  const isLoading = viewMode === 'week' ? weekLoading : monthLoading;

  if (!familyId) {
    return (
      <>
        <Header title="Meal Planner" description="Plan your weekly meals" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <Utensils className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Family Selected</h2>
          <p className="text-gray-500">Please create or join a family to use the meal planner.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Meal Planner" description="Plan and track your family's meals" />

      <div className="p-6 max-w-7xl mx-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Calendar className="w-4 h-4" /> Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                viewMode === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" /> Month
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[180px] text-center">{periodLabel}</span>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Add meal button */}
          <button
            onClick={() => handleAddSlot(format(new Date(), 'yyyy-MM-dd'))}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Meal
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          {Object.entries(STATUS_STYLES).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={cn('w-3 h-3 rounded-sm border', cls)} />
              <span className="text-xs text-gray-500 capitalize">{status.toLowerCase()}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          {viewMode === 'week' ? (
            <WeekView
              weekStart={weekStart}
              meals={meals}
              isLoading={isLoading}
              onAddSlot={handleAddSlot}
              onDelete={(id) => deleteMeal.mutate(id)}
            />
          ) : (
            <MonthView
              currentDate={currentDate}
              meals={meals}
              isLoading={isLoading}
              onDayClick={(date) => handleAddSlot(date)}
            />
          )}
        </div>
      </div>

      {/* Add Meal Modal */}
      {familyId && (
        <AddMealModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          prefillDate={prefillDate}
          prefillMealType={prefillMealType}
          familyId={familyId}
        />
      )}
    </>
  );
}
