'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Check,
  SkipForward,
  Trash2,
  Search,
  Utensils,
  Clock,
  Users,
  DollarSign,
  Flame,
  Edit3,
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
  parseISO,
  isToday,
} from 'date-fns';
import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import { mealsApi, recipesApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils/cn';
import { MEAL_TYPES } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MealRecipe {
  id: string;
  name: string;
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  estimatedCost?: number;
  ingredients?: Array<{ ingredient?: { name: string }; quantity: number; unit: string }>;
}

interface Meal {
  id: string;
  familyId: string;
  mealType: string;
  scheduledAt: string;
  date: string;
  status: string;
  servings: number;
  recipe?: MealRecipe;
  customMealName?: string;
}

type ViewMode = 'day' | 'week' | 'month';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string; hour: number }> = {
  BREAKFAST: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', hour: 8 },
  LUNCH:     { color: 'text-blue-700',  bg: 'bg-blue-50',  border: 'border-blue-200',  dot: 'bg-blue-400',  hour: 13 },
  SNACK:     { color: 'text-pink-700',  bg: 'bg-pink-50',  border: 'border-pink-200',  dot: 'bg-pink-400',  hour: 16 },
  DINNER:    { color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', dot: 'bg-violet-400', hour: 19 },
};

const STATUS_BADGE: Record<string, string> = {
  PLANNED:   'bg-slate-100 text-slate-600',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  SKIPPED:   'bg-gray-100 text-gray-500',
  CHANGED:   'bg-orange-100 text-orange-700',
};

const DAY_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6am–10pm

// ─── Animation Variants ───────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8,  transition: { duration: 0.18 } },
};

const cardVariants = {
  hidden:  { opacity: 0, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' },
  }),
};

const drawerVariants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0,      opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 32 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid({ cols }: { cols: number }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `80px repeat(${cols}, 1fr)` }}>
        <div />
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: 4 }).map((_, ri) => (
        <div key={ri} className={`grid gap-2`} style={{ gridTemplateColumns: `80px repeat(${cols}, 1fr)` }}>
          <div className="h-16 bg-gray-100 rounded" />
          {Array.from({ length: cols }).map((_, ci) => (
            <div key={ci} className="h-16 bg-gray-100/80 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Meal Drawer (Slide-over) ─────────────────────────────────────────────────

interface MealDrawerProps {
  meal: Meal | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
}

function MealDrawer({ meal, onClose, onDelete, onComplete, onSkip }: MealDrawerProps) {
  if (!meal) return null;
  const cfg = MEAL_TYPE_CONFIG[meal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST;
  const name = meal.recipe?.name ?? meal.customMealName ?? 'Unnamed Meal';
  const r = meal.recipe;

  return (
    <AnimatePresence>
      {meal && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className={cn('px-6 pt-6 pb-5', cfg.bg)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full mb-2', cfg.bg, cfg.color, cfg.border, 'border')}>
                    <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                    {MEAL_TYPES.find((m) => m.value === meal.mealType)?.label ?? meal.mealType}
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight truncate">{name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {format(parseISO(meal.scheduledAt ?? meal.date), 'EEEE, MMMM d')} · {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-black/5 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Status */}
              <span className={cn('mt-2 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', STATUS_BADGE[meal.status] ?? STATUS_BADGE.PLANNED)}>
                {meal.status}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Nutrition */}
              {r && (r.calories != null || r.protein != null) && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nutrition</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Calories', value: r.calories, unit: 'kcal', icon: Flame, color: 'text-orange-500 bg-orange-50' },
                      { label: 'Protein',  value: r.protein,  unit: 'g',    icon: null, color: 'text-blue-500 bg-blue-50' },
                      { label: 'Carbs',    value: r.carbs,    unit: 'g',    icon: null, color: 'text-green-500 bg-green-50' },
                      { label: 'Fat',      value: r.fat,      unit: 'g',    icon: null, color: 'text-violet-500 bg-violet-50' },
                    ].map(({ label, value, unit, color }) =>
                      value != null ? (
                        <div key={label} className={cn('rounded-xl p-3 text-center', color.split(' ')[1])}>
                          <p className={cn('text-lg font-bold', color.split(' ')[0])}>{value}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{label}</p>
                          <p className="text-[10px] text-gray-400">{unit}</p>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Cost */}
              {r?.estimatedCost != null && (
                <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 rounded-xl border border-yellow-100">
                  <DollarSign className="w-4 h-4 text-yellow-600" />
                  <div>
                    <p className="text-xs text-gray-500">Estimated Cost</p>
                    <p className="text-sm font-bold text-gray-800">₹{r.estimatedCost.toFixed(2)}</p>
                  </div>
                </div>
              )}

              {/* Ingredients */}
              {r?.ingredients && r.ingredients.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ingredients</h3>
                  <ul className="space-y-2">
                    {r.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                          {ing.ingredient?.name ?? 'Ingredient'}
                        </span>
                        <span className="text-gray-400 text-xs font-medium">{ing.quantity} {ing.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Empty state for custom meals */}
              {!r && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                  <Utensils className="w-12 h-12 mb-3" />
                  <p className="text-sm text-gray-400">Custom meal — no recipe details</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              {meal.status !== 'COMPLETED' && (
                <button
                  onClick={() => { onComplete(meal.id); onClose(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-4 h-4" /> Mark Complete
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                {meal.status !== 'SKIPPED' && (
                  <button
                    onClick={() => { onSkip(meal.id); onClose(); }}
                    className="flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    <SkipForward className="w-4 h-4" /> Skip
                  </button>
                )}
                <button
                  onClick={() => { onDelete(meal.id); onClose(); }}
                  className="flex items-center justify-center gap-2 py-2.5 border border-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Draggable Meal Card ──────────────────────────────────────────────────────

interface MealCardProps {
  meal: Meal;
  index: number;
  onOpen: (meal: Meal) => void;
  compact?: boolean;
}

function DraggableMealCard({ meal, index, onOpen, compact = false }: MealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meal.id,
    data: { meal },
  });

  const cfg = MEAL_TYPE_CONFIG[meal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST;
  const name = meal.recipe?.name ?? meal.customMealName ?? 'Unnamed';

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 99 }
    : undefined;

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index}
      onClick={() => onOpen(meal)}
      className={cn(
        'rounded-lg border px-2 py-1.5 cursor-grab active:cursor-grabbing select-none',
        cfg.bg, cfg.border, cfg.color,
        isDragging ? 'opacity-50 shadow-xl ring-2 ring-offset-1' : 'hover:shadow-md transition-shadow',
        compact ? 'flex items-center gap-1.5' : ''
      )}
    >
      {compact ? (
        <>
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
          <span className="text-[11px] font-semibold truncate">{name}</span>
        </>
      ) : (
        <>
          <p className="text-xs font-semibold leading-tight truncate">{name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Users className="w-2.5 h-2.5 opacity-60" />
            <span className="text-[10px] opacity-70">{meal.servings} srv</span>
            {meal.status === 'COMPLETED' && <Check className="w-2.5 h-2.5 text-emerald-500 ml-auto" />}
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─── Droppable Cell ───────────────────────────────────────────────────────────

function DroppableCell({
  id,
  children,
  onAdd,
  className,
}: {
  id: string;
  children: React.ReactNode;
  onAdd: () => void;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[56px] rounded-xl p-1 space-y-1 transition-colors group',
        isOver ? 'bg-green-50 ring-2 ring-green-300' : 'bg-gray-50/80',
        className
      )}
    >
      {children}
      <button
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="w-full h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-green-50 rounded-lg border border-dashed border-gray-200 hover:border-green-300 transition-all text-gray-300 hover:text-green-500"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface WeekViewProps {
  weekStart: Date;
  meals: Meal[];
  isLoading: boolean;
  onAddSlot: (date: string, mealType: string) => void;
  onOpenMeal: (meal: Meal) => void;
}

function WeekView({ weekStart, meals, isLoading, onAddSlot, onOpenMeal }: WeekViewProps) {
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) });

  if (isLoading) return <SkeletonGrid cols={7} />;

  return (
    <div className="overflow-x-auto -mx-1">
      <div className="min-w-[720px] px-1">
        {/* Day headers */}
        <div className="grid gap-1.5 mb-2" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
          <div />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'text-center py-2.5 rounded-xl text-xs font-semibold transition-colors',
                isToday(day)
                  ? 'bg-green-600 text-white shadow-md shadow-green-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              )}
            >
              <p className="uppercase tracking-wide">{format(day, 'EEE')}</p>
              <p className={cn('text-base font-bold mt-0.5', isToday(day) ? 'text-white' : 'text-gray-800')}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Meal type rows */}
        {MEAL_TYPES.map((mt) => {
          const cfg = MEAL_TYPE_CONFIG[mt.value] ?? MEAL_TYPE_CONFIG.BREAKFAST;
          return (
            <div key={mt.value} className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: '72px repeat(7, 1fr)' }}>
              {/* Label */}
              <div className="flex flex-col items-end justify-center pr-2 gap-0.5">
                <span className={cn('text-[10px] font-bold uppercase tracking-wide', cfg.color)}>{mt.label}</span>
                <span className="text-[9px] text-gray-400">{mt.time}</span>
              </div>

              {/* Day cells */}
              {days.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayMeals = meals.filter((m) => {
                  const mDate = m.scheduledAt ?? m.date;
                  return m.mealType === mt.value && (mDate.startsWith(dateStr) || isSameDay(parseISO(mDate), day));
                });

                return (
                  <DroppableCell
                    key={day.toISOString()}
                    id={`${dateStr}__${mt.value}`}
                    onAdd={() => onAddSlot(dateStr, mt.value)}
                  >
                    {dayMeals.map((meal, i) => (
                      <DraggableMealCard key={meal.id} meal={meal} index={i} onOpen={onOpenMeal} />
                    ))}
                  </DroppableCell>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

interface DayViewProps {
  currentDate: Date;
  meals: Meal[];
  isLoading: boolean;
  onAddSlot: (date: string, mealType: string) => void;
  onOpenMeal: (meal: Meal) => void;
}

function DayView({ currentDate, meals, isLoading, onAddSlot, onOpenMeal }: DayViewProps) {
  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const dayMeals = meals.filter((m) => {
    const mDate = m.scheduledAt ?? m.date;
    return mDate.startsWith(dateStr) || isSameDay(parseISO(mDate), currentDate);
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-12 h-16 bg-gray-100 rounded" />
            <div className="flex-1 h-16 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Hour rows */}
      <div className="space-y-1">
        {DAY_HOURS.map((hour) => {
          const hourMeals = dayMeals.filter((m) => {
            const cfg = MEAL_TYPE_CONFIG[m.mealType];
            return cfg?.hour === hour;
          });

          return (
            <div key={hour} className="flex gap-3 group min-h-[64px]">
              {/* Time label */}
              <div className="w-12 flex-shrink-0 text-right pt-2">
                <span className="text-xs text-gray-400 font-medium">
                  {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 border-t border-gray-100 pt-2 pb-1">
                {hourMeals.length > 0 ? (
                  <div className="space-y-2">
                    {hourMeals.map((meal, i) => {
                      const cfg = MEAL_TYPE_CONFIG[meal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST;
                      const name = meal.recipe?.name ?? meal.customMealName ?? 'Unnamed';
                      return (
                        <motion.div
                          key={meal.id}
                          variants={cardVariants}
                          initial="hidden"
                          animate="visible"
                          custom={i}
                          onClick={() => onOpenMeal(meal)}
                          className={cn(
                            'rounded-xl border px-4 py-3 cursor-pointer hover:shadow-md transition-shadow',
                            cfg.bg, cfg.border
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className={cn('font-bold text-sm', cfg.color)}>{name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {MEAL_TYPES.find((m) => m.value === meal.mealType)?.label} · {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_BADGE[meal.status] ?? STATUS_BADGE.PLANNED)}>
                              {meal.status}
                            </span>
                          </div>
                          {meal.recipe?.calories != null && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                              <Flame className="w-3 h-3 text-orange-400" />
                              {meal.recipe.calories} kcal
                              {meal.recipe.estimatedCost != null && (
                                <>
                                  <span className="mx-1">·</span>
                                  <DollarSign className="w-3 h-3 text-yellow-500" />
                                  ₹{meal.recipe.estimatedCost}
                                </>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {MEAL_TYPES.filter((mt) => MEAL_TYPE_CONFIG[mt.value]?.hour === hour).map((mt) => (
                      <button
                        key={mt.value}
                        onClick={() => onAddSlot(dateStr, mt.value)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-500 text-xs font-medium transition-colors"
                      >
                        <Plus className="w-3 h-3" /> {mt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

interface MonthViewProps {
  currentDate: Date;
  meals: Meal[];
  isLoading: boolean;
  onDayClick: (date: string) => void;
}

function MonthView({ currentDate, meals, isLoading, onDayClick }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 rounded" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-1.5 mb-1.5">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className="h-24 bg-gray-50 rounded-xl" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1.5 uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {weeks.map((weekStart) => {
        const days = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
        return (
          <div key={weekStart.toISOString()} className="grid grid-cols-7 gap-1.5 mb-1.5">
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const dayMeals = meals.filter((m) => {
                const mDate = m.scheduledAt ?? m.date;
                return mDate.startsWith(dateStr) || isSameDay(parseISO(mDate), day);
              });

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDayClick(dateStr)}
                  className={cn(
                    'min-h-[88px] p-2 rounded-xl text-left border transition-all hover:shadow-md',
                    isCurrentMonth
                      ? 'bg-white border-gray-100 hover:border-green-200'
                      : 'bg-gray-50/50 border-transparent',
                    isToday(day) && 'border-green-400 ring-1 ring-green-300 shadow-sm'
                  )}
                >
                  <span
                    className={cn(
                      'text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full',
                      isToday(day)
                        ? 'bg-green-600 text-white'
                        : isCurrentMonth ? 'text-gray-800' : 'text-gray-300'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayMeals.slice(0, 3).map((meal) => {
                      const cfg = MEAL_TYPE_CONFIG[meal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST;
                      return (
                        <div
                          key={meal.id}
                          className={cn('flex items-center gap-1 rounded px-1 py-0.5', cfg.bg)}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
                          <span className={cn('text-[10px] font-medium truncate', cfg.color)}>
                            {meal.recipe?.name ?? meal.customMealName ?? 'Meal'}
                          </span>
                        </div>
                      );
                    })}
                    {dayMeals.length > 3 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{dayMeals.length - 3} more</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Add Meal Modal ───────────────────────────────────────────────────────────

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
    queryKey: ['recipes-picker', recipeSearch],
    queryFn: () =>
      recipesApi.list({ search: recipeSearch || undefined, limit: 20 }).then((r) => {
        const d = r.data.data;
        return (d?.items ?? d ?? []) as Array<{ id: string; name: string }>;
      }),
    enabled: !useCustom,
  });

  const createMeal = useMutation({
    mutationFn: (data: Record<string, unknown>) => mealsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meals'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMeal.mutate({
      familyId,
      scheduledAt: date,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Schedule a Meal</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Meal Type</label>
            <div className="grid grid-cols-2 gap-2">
              {MEAL_TYPES.map((mt) => {
                const cfg = MEAL_TYPE_CONFIG[mt.value] ?? MEAL_TYPE_CONFIG.BREAKFAST;
                return (
                  <button
                    key={mt.value}
                    type="button"
                    onClick={() => setMealType(mt.value)}
                    className={cn(
                      'px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all flex items-center gap-2',
                      mealType === mt.value
                        ? cn(cfg.bg, cfg.border, cfg.color, 'ring-1', cfg.border.replace('border-', 'ring-'))
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    <span>{mt.emoji}</span> {mt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggle */}
          <div>
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setUseCustom(false)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                  !useCustom ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                )}
              >
                Pick Recipe
              </button>
              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                  useCustom ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
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
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {selectedRecipe && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2.5 bg-green-50 rounded-xl border border-green-200">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-sm text-green-700 font-semibold">{selectedRecipe.name}</span>
                    <button type="button" onClick={() => setSelectedRecipe(null)} className="ml-auto text-green-400 hover:text-green-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {recipes && recipes.length > 0 && !selectedRecipe && (
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-100">
                    {recipes.map((recipe) => (
                      <button
                        key={recipe.id}
                        type="button"
                        onClick={() => setSelectedRecipe({ id: recipe.id, name: recipe.name })}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors"
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Servings</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold text-lg"
              >
                −
              </button>
              <span className="text-xl font-bold text-gray-900 w-8 text-center">{servings}</span>
              <button
                type="button"
                onClick={() => setServings(servings + 1)}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-gray-700 font-bold text-lg"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={createMeal.isPending}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-green-200"
          >
            {createMeal.isPending ? 'Scheduling...' : 'Schedule Meal'}
          </button>
          {createMeal.isError && (
            <p className="text-xs text-red-500 text-center">Failed to schedule. Please try again.</p>
          )}
        </form>
      </motion.div>
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
  const [drawerMeal, setDrawerMeal] = useState<Meal | null>(null);
  const [activeDragMeal, setActiveDragMeal] = useState<Meal | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Date ranges
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });

  // Fetch — week/day share the same query (week range)
  const { data: weekMeals, isLoading: weekLoading } = useQuery({
    queryKey: ['meals', familyId, 'week', format(weekStart, 'yyyy-MM-dd')],
    queryFn: () =>
      mealsApi
        .list({ familyId, startDate: format(weekStart, 'yyyy-MM-dd'), endDate: format(weekEnd, 'yyyy-MM-dd') })
        .then((r) => {
          const list = Array.isArray(r.data.data) ? r.data.data : [];
          return list.map((m: Record<string, unknown>) => ({ ...m, date: (m.scheduledAt as string) ?? (m.date as string) })) as Meal[];
        }),
    enabled: !!familyId && (viewMode === 'week' || viewMode === 'day'),
  });

  // Fetch — month
  const { data: monthMeals, isLoading: monthLoading } = useQuery({
    queryKey: ['meals-calendar', familyId, currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: () =>
      mealsApi
        .getCalendar(familyId!, currentDate.getFullYear(), currentDate.getMonth() + 1)
        .then((r) => {
          const calData = r.data.data;
          if (calData?.calendar) {
            return Object.entries(calData.calendar as Record<string, unknown[]>).flatMap(([dateStr, entries]) =>
              (entries as Record<string, unknown>[]).map((e) => ({ ...e, date: (e.scheduledAt as string) ?? dateStr }))
            ) as Meal[];
          }
          return (Array.isArray(calData) ? calData : []) as Meal[];
        }),
    enabled: !!familyId && viewMode === 'month',
  });

  const deleteMeal = useMutation({
    mutationFn: (id: string) => mealsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const completeMeal = useMutation({
    mutationFn: (id: string) => mealsApi.complete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const skipMeal = useMutation({
    mutationFn: (id: string) => mealsApi.skip(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const updateMeal = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => mealsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });

  const handleDragStart = (event: DragStartEvent) => {
    const meal = (event.active.data.current as { meal: Meal })?.meal;
    if (meal) setActiveDragMeal(meal);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragMeal(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // over.id format: "yyyy-MM-dd__MEALTYPE"
    const overId = String(over.id);
    if (!overId.includes('__')) return;
    const [newDate, newMealType] = overId.split('__');
    const meal = (active.data.current as { meal: Meal })?.meal;
    if (!meal) return;

    // Build new scheduledAt preserving time
    updateMeal.mutate({ id: meal.id, data: { scheduledAt: newDate, mealType: newMealType } });
  };

  const handleAddSlot = (date: string, mealType?: string) => {
    setPrefillDate(date);
    setPrefillMealType(mealType);
    setModalOpen(true);
  };

  const handlePrev = () => {
    if (viewMode === 'week') setCurrentDate((d) => subWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate((d) => subMonths(d, 1));
    else setCurrentDate((d) => addDays(d, -1));
  };

  const handleNext = () => {
    if (viewMode === 'week') setCurrentDate((d) => addWeeks(d, 1));
    else if (viewMode === 'month') setCurrentDate((d) => addMonths(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const periodLabel =
    viewMode === 'week'
      ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
      : viewMode === 'month'
      ? format(currentDate, 'MMMM yyyy')
      : format(currentDate, 'EEEE, MMMM d, yyyy');

  const meals = viewMode === 'month' ? monthMeals ?? [] : weekMeals ?? [];
  const isLoading = viewMode === 'month' ? monthLoading : weekLoading;

  if (!familyId) {
    return (
      <>
        <Header title="Meal Planner" description="Plan your family's meals" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Utensils className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Family Selected</h2>
          <p className="text-gray-500 text-sm">Please create or join a family to use the meal planner.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Meal Planner" description="Plan and track your family's meals" />

      <div className="p-5 max-w-7xl mx-auto">
        {/* Top Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          {/* View Switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize',
                  viewMode === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold text-gray-900 min-w-[220px] text-center">{periodLabel}</span>
            <button
              onClick={handleNext}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3.5 py-1.5 rounded-xl bg-gray-100 text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
          </div>

          {/* Add Meal */}
          <button
            onClick={() => handleAddSlot(format(currentDate, 'yyyy-MM-dd'))}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm shadow-green-200"
          >
            <Plus className="w-4 h-4" /> Add Meal
          </button>
        </div>

        {/* Meal Type Legend */}
        <div className="flex items-center gap-4 mb-5 flex-wrap">
          {MEAL_TYPES.map((mt) => {
            const cfg = MEAL_TYPE_CONFIG[mt.value] ?? MEAL_TYPE_CONFIG.BREAKFAST;
            return (
              <div key={mt.value} className="flex items-center gap-1.5">
                <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                <span className="text-xs font-medium text-gray-500">{mt.label}</span>
              </div>
            );
          })}
        </div>

        {/* Calendar Container */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {viewMode === 'week' && (
                  <WeekView
                    weekStart={weekStart}
                    meals={meals}
                    isLoading={isLoading}
                    onAddSlot={handleAddSlot}
                    onOpenMeal={setDrawerMeal}
                  />
                )}
                {viewMode === 'day' && (
                  <DayView
                    currentDate={currentDate}
                    meals={meals}
                    isLoading={isLoading}
                    onAddSlot={handleAddSlot}
                    onOpenMeal={setDrawerMeal}
                  />
                )}
                {viewMode === 'month' && (
                  <MonthView
                    currentDate={currentDate}
                    meals={meals}
                    isLoading={isLoading}
                    onDayClick={(date) => {
                      setCurrentDate(parseISO(date));
                      setViewMode('day');
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeDragMeal && (
              <div
                className={cn(
                  'rounded-lg border px-2 py-1.5 shadow-2xl rotate-2 opacity-90',
                  (MEAL_TYPE_CONFIG[activeDragMeal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST).bg,
                  (MEAL_TYPE_CONFIG[activeDragMeal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST).border,
                  (MEAL_TYPE_CONFIG[activeDragMeal.mealType] ?? MEAL_TYPE_CONFIG.BREAKFAST).color,
                )}
              >
                <p className="text-xs font-semibold leading-tight">
                  {activeDragMeal.recipe?.name ?? activeDragMeal.customMealName ?? 'Unnamed'}
                </p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Meal Drawer */}
      <AnimatePresence>
        {drawerMeal && (
          <MealDrawer
            meal={drawerMeal}
            onClose={() => setDrawerMeal(null)}
            onDelete={(id) => { deleteMeal.mutate(id); }}
            onComplete={(id) => { completeMeal.mutate(id); }}
            onSkip={(id) => { skipMeal.mutate(id); }}
          />
        )}
      </AnimatePresence>

      {/* Add Meal Modal */}
      <AnimatePresence>
        {modalOpen && familyId && (
          <AddMealModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            prefillDate={prefillDate}
            prefillMealType={prefillMealType}
            familyId={familyId}
          />
        )}
      </AnimatePresence>
    </>
  );
}
