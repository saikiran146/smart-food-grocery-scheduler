'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Package,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Plus,
  Calendar,
  ShoppingCart,
  Trash2,
  Sparkles,
  Bell,
  ChevronRight,
  Utensils,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import {
  analyticsApi,
  aiApi,
  fruitsApi,
  mealsApi,
} from '@/lib/api/endpoints';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';

// ─── Skeleton helpers ───────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: { value: string; positive: boolean };
}

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.positive ? 'text-green-600' : 'text-red-500')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700',
  MEDIUM: 'bg-orange-100 text-orange-700',
  LOW: 'bg-green-100 text-green-700',
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', PRIORITY_STYLES[priority] ?? 'bg-gray-100 text-gray-600')}>
      {priority}
    </span>
  );
}

// ─── Meal Status Badge ────────────────────────────────────────────────────────

const MEAL_STATUS_STYLES: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SKIPPED: 'bg-gray-100 text-gray-600',
  CHANGED: 'bg-orange-100 text-orange-700',
};

function MealStatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', MEAL_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600')}>
      {status}
    </span>
  );
}

// ─── Quick Action Card ────────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon, color }: {
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all group"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center transition-colors', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-medium text-gray-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

// ─── No Family prompt ─────────────────────────────────────────────────────────

function NoFamilyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-green-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">No Family Selected</h2>
      <p className="text-gray-500 mb-6 max-w-sm">
        Create or join a family group to start tracking meals, inventory, and reduce food waste.
      </p>
      <div className="flex gap-3">
        <Link
          href="/settings"
          className="px-5 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Create a Family
        </Link>
        <Link
          href="/settings"
          className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          Join with Code
        </Link>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { selectedFamilyId: familyId } = useFamily();

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics-dashboard', familyId],
    queryFn: () => analyticsApi.getDashboard(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: aiSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['ai-suggestions', familyId],
    queryFn: () => aiApi.getSuggestions(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: fruitAlerts, isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruit-alerts', familyId],
    queryFn: () => fruitsApi.getAlerts(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: todayMeals, isLoading: mealsLoading } = useQuery({
    queryKey: ['meals-today', familyId, today],
    queryFn: () =>
      mealsApi
        .list({ familyId, startDate: today, endDate: today })
        .then((r) => {
          const list = Array.isArray(r.data.data) ? r.data.data : [];
          return list.map((m: any) => ({ ...m, date: m.scheduledAt ?? m.date }));
        }),
    enabled: !!familyId,
  });

  if (!familyId) return (
    <>
      <Header title="Dashboard" description="Your smart food & grocery overview" />
      <NoFamilyPrompt />
    </>
  );

  // Normalize nested analytics into flat stat fields the UI expects
  const rawAnalytics = analytics ?? ({} as any);
  const stats = {
    totalInventoryItems: rawAnalytics.inventory?.totalItems ?? 0,
    totalInventoryValue: rawAnalytics.inventory?.totalValue ?? 0,
    expiringCount: rawAnalytics.inventory?.expiringSoonCount ?? rawAnalytics.inventory?.expiringSoon ?? 0,
    monthlyWasteCost: rawAnalytics.waste?.wasteCostThisMonth ?? rawAnalytics.waste?.monthlyWasteCost ?? 0,
  };

  return (
    <>
      <Header title="Dashboard" description="Your smart food & grocery overview" />

      <div className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* ── Stat Cards ── */}
        <section>
          {analyticsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Total Inventory Items"
                value={stats.totalInventoryItems ?? 0}
                sub="items in stock"
                icon={Package}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <StatCard
                label="Total Inventory Value"
                value={formatCurrency(stats.totalInventoryValue ?? 0)}
                sub="estimated value"
                icon={DollarSign}
                iconBg="bg-green-50"
                iconColor="text-green-600"
              />
              <StatCard
                label="Expiring Soon"
                value={stats.expiringCount ?? 0}
                sub="items expiring in 3 days"
                icon={AlertTriangle}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
              />
              <StatCard
                label="Monthly Waste Cost"
                value={formatCurrency(stats.monthlyWasteCost ?? 0)}
                sub="wasted this month"
                icon={TrendingDown}
                iconBg="bg-red-50"
                iconColor="text-red-500"
              />
            </div>
          )}
        </section>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Left column: AI + Fruit Alerts */}
          <div className="xl:col-span-2 space-y-8">

            {/* AI Suggestions */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-600" />
                  <h2 className="text-base font-bold text-gray-900">AI Suggestions</h2>
                </div>
                <Link href="/ai-suggestions" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {suggestionsLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
                </div>
              ) : aiSuggestions && aiSuggestions.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(aiSuggestions as any[]).slice(0, 4).map((suggestion: any, idx: number) => (
                    <div
                      key={suggestion.id ?? idx}
                      className="bg-white rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-colors shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900 leading-snug">{suggestion.title ?? suggestion.type}</p>
                        <PriorityBadge priority={suggestion.priority ?? 'LOW'} />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{suggestion.description ?? suggestion.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                  <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No AI suggestions right now. Check back soon!</p>
                </div>
              )}
            </section>

            {/* Fruit Alerts */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <h2 className="text-base font-bold text-gray-900">Fruit Alerts</h2>
                </div>
                <Link href="/fruits" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                  View all <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {fruitsLoading ? (
                <SkeletonList rows={2} />
              ) : fruitAlerts && (fruitAlerts as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(fruitAlerts as any[]).map((alert: any, idx: number) => (
                    <div
                      key={alert.id ?? idx}
                      className={cn(
                        'bg-white rounded-xl p-4 border flex items-start gap-3',
                        alert.severity === 'HIGH' ? 'border-red-200 bg-red-50' :
                        alert.severity === 'MEDIUM' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        alert.severity === 'HIGH' ? 'bg-red-100' :
                        alert.severity === 'MEDIUM' ? 'bg-orange-100' : 'bg-yellow-100'
                      )}>
                        <AlertTriangle className={cn(
                          'w-4 h-4',
                          alert.severity === 'HIGH' ? 'text-red-600' :
                          alert.severity === 'MEDIUM' ? 'text-orange-600' : 'text-yellow-600'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{alert.fruitName ?? alert.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{alert.message ?? alert.description}</p>
                        {alert.ripenessLevel && (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-white rounded-full border text-gray-600">
                            {alert.ripenessLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                  <p className="text-sm text-gray-500">No fruit alerts. All fruits are in good condition!</p>
                </div>
              )}
            </section>
          </div>

          {/* Right column: Today's Meals + Quick Actions */}
          <div className="space-y-8">

            {/* Today's Meals */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-green-600" />
                  <h2 className="text-base font-bold text-gray-900">Today's Meals</h2>
                </div>
                <Link href="/meal-planner" className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                  Plan <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {mealsLoading ? (
                <SkeletonList rows={3} />
              ) : todayMeals && (todayMeals as any[]).length > 0 ? (
                <div className="space-y-3">
                  {(todayMeals as any[]).map((meal: any) => (
                    <div
                      key={meal.id}
                      className="bg-white rounded-xl p-4 border border-gray-100 hover:border-green-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {meal.recipe?.name ?? meal.customMealName ?? 'Unnamed Meal'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 capitalize">
                            {meal.mealType?.toLowerCase()} · {meal.servings} servings
                          </p>
                        </div>
                        <MealStatusBadge status={meal.status ?? 'PLANNED'} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                  <Utensils className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">No meals planned for today.</p>
                  <Link
                    href="/meal-planner"
                    className="inline-flex items-center gap-1 text-sm text-green-600 hover:text-green-700 font-medium"
                  >
                    <Plus className="w-4 h-4" /> Add meals
                  </Link>
                </div>
              )}
            </section>

            {/* Quick Actions */}
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction href="/inventory" label="Add Grocery" icon={Plus} color="bg-green-600 group-hover:bg-green-700" />
                <QuickAction href="/meal-planner" label="Plan Meals" icon={Calendar} color="bg-blue-600 group-hover:bg-blue-700" />
                <QuickAction href="/shopping" label="Shopping List" icon={ShoppingCart} color="bg-purple-600 group-hover:bg-purple-700" />
                <QuickAction href="/waste" label="Log Waste" icon={Trash2} color="bg-red-500 group-hover:bg-red-600" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
