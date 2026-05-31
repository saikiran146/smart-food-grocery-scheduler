'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  Package, TrendingDown, AlertTriangle, IndianRupee, Plus,
  Calendar, ShoppingCart, Trash2, Sparkles, Bell, ChevronRight,
  Utensils, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import { analyticsApi, aiApi, fruitsApi, mealsApi } from '@/lib/api/endpoints';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { format } from 'date-fns';

// ── Skeletons ──────────────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-100 rounded w-28" />
          <div className="h-7 bg-gray-100 rounded w-20" />
          <div className="h-2.5 bg-gray-100 rounded w-24" />
        </div>
        <div className="w-11 h-11 bg-gray-100 rounded-xl shrink-0 ml-3" />
      </div>
    </div>
  );
}

function SkeletonRows({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-100 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;       // Tailwind color class prefix, e.g. "blue"
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ label, value, sub, icon: Icon, accent, trend, trendUp }: StatCardProps) {
  const accentMap: Record<string, { bg: string; iconBg: string; iconColor: string; trendColor: string }> = {
    blue:    { bg: 'bg-blue-50/60',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   trendColor: 'text-blue-600' },
    emerald: { bg: 'bg-emerald-50/60',iconBg: 'bg-emerald-100',iconColor: 'text-emerald-600',trendColor: 'text-emerald-600' },
    orange:  { bg: 'bg-orange-50/60', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', trendColor: 'text-orange-600' },
    red:     { bg: 'bg-red-50/60',    iconBg: 'bg-red-100',    iconColor: 'text-red-500',    trendColor: 'text-red-500' },
  };
  const a = accentMap[accent] ?? accentMap.blue;

  return (
    <div className={cn('rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 group', a.bg, 'bg-white')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1.5">{sub}</p>}
          {trend && (
            <p className={cn('flex items-center gap-1 text-xs mt-1.5 font-semibold', a.trendColor)}>
              {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trend}
            </p>
          )}
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', a.iconBg)}>
          <Icon className={cn('w-5 h-5', a.iconColor)} />
        </div>
      </div>
    </div>
  );
}

// ── Priority badge ─────────────────────────────────────────────────────────────

function PriorityDot({ priority }: { priority: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full',
      priority === 'HIGH'   ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
      priority === 'MEDIUM' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' :
                              'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    )}>
      <span className={cn(
        'w-1.5 h-1.5 rounded-full',
        priority === 'HIGH' ? 'bg-red-500' : priority === 'MEDIUM' ? 'bg-orange-500' : 'bg-emerald-500',
      )} />
      {priority}
    </span>
  );
}

// ── Meal status badge ──────────────────────────────────────────────────────────

function MealBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[11px] font-semibold px-2 py-0.5 rounded-full',
      status === 'PLANNED'   ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
      status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
      status === 'SKIPPED'   ? 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' :
                               'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    )}>
      {status}
    </span>
  );
}

// ── Quick action ───────────────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon, gradient }: {
  href: string; label: string; icon: React.ElementType; gradient: string;
}) {
  return (
    <Link href={href} className="group relative overflow-hidden rounded-xl p-4 border border-gray-100 bg-white hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col items-center gap-2.5">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm', gradient)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
    </Link>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconClass, href, hrefLabel = 'View all', children }: {
  title: string;
  icon: React.ElementType;
  iconClass: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconClass)}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <h2 className="section-title">{title}</h2>
        </div>
        {href && (
          <Link href={href} className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
            {hrefLabel} <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function Empty({ icon: Icon, message, cta, ctaHref }: {
  icon: React.ElementType; message: string; cta?: string; ctaHref?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-6 py-8 text-center">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {cta && ctaHref && (
        <Link href={ctaHref} className="inline-flex items-center gap-1 mt-3 text-xs text-emerald-600 font-semibold hover:text-emerald-700">
          <Plus className="w-3.5 h-3.5" /> {cta}
        </Link>
      )}
    </div>
  );
}

// ── No family ──────────────────────────────────────────────────────────────────

function NoFamilyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 fade-in">
      <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-200">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Set up your family</h2>
      <p className="text-gray-500 text-sm mb-6 max-w-xs leading-relaxed">
        Create or join a family to unlock meal planning, shared inventory, and AI recommendations.
      </p>
      <div className="flex gap-3">
        <Link href="/settings" className="btn-primary btn-md">Create a Family</Link>
        <Link href="/settings" className="btn-outline btn-md">Join with Code</Link>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { selectedFamilyId: familyId } = useFamily();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: analytics, isLoading: aLoading } = useQuery({
    queryKey: ['analytics-dashboard', familyId],
    queryFn: () => analyticsApi.getDashboard(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: aiSuggestions, isLoading: sLoading } = useQuery({
    queryKey: ['ai-suggestions', familyId],
    queryFn: () => aiApi.getSuggestions(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: fruitAlerts, isLoading: fLoading } = useQuery({
    queryKey: ['fruit-alerts', familyId],
    queryFn: () => fruitsApi.getAlerts(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: todayMeals, isLoading: mLoading } = useQuery({
    queryKey: ['meals-today', familyId, today],
    queryFn: () =>
      mealsApi.list({ familyId, startDate: today, endDate: today }).then((r) => {
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

  const raw = analytics ?? ({} as any);
  const stats = {
    totalItems:   raw.inventory?.totalItems ?? 0,
    totalValue:   raw.inventory?.totalValue ?? 0,
    expiring:     raw.inventory?.expiringSoonCount ?? raw.inventory?.expiringSoon ?? 0,
    wasteCost:    raw.waste?.wasteCostThisMonth ?? raw.waste?.monthlyWasteCost ?? 0,
  };

  const suggestions: any[] = Array.isArray(aiSuggestions) ? aiSuggestions : [];
  const alerts: any[] = Array.isArray(fruitAlerts) ? fruitAlerts : [];
  const meals: any[] = Array.isArray(todayMeals) ? todayMeals : [];

  return (
    <>
      <Header title="Dashboard" description={`Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}! Here's your overview.`} />

      <div className="p-6 space-y-7 max-w-7xl fade-in">

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {aLoading ? (
            [0,1,2,3].map((i) => <SkeletonStatCard key={i} />)
          ) : (
            <>
              <StatCard label="Inventory Items" value={stats.totalItems} sub="items in stock" icon={Package} accent="blue" />
              <StatCard label="Inventory Value" value={formatCurrency(stats.totalValue)} sub="estimated worth" icon={IndianRupee} accent="emerald" trendUp trend="Current value" />
              <StatCard label="Expiring Soon" value={stats.expiring} sub="within 3 days" icon={AlertTriangle} accent="orange" />
              <StatCard label="Waste This Month" value={formatCurrency(stats.wasteCost)} sub="food cost wasted" icon={TrendingDown} accent="red" />
            </>
          )}
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left: AI + Fruit Alerts */}
          <div className="xl:col-span-2 space-y-6">

            {/* AI Suggestions */}
            <Section title="AI Suggestions" icon={Sparkles} iconClass="bg-purple-100 text-purple-600" href="/ai-suggestions">
              {sLoading ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {[0,1,2,3].map((i) => <SkeletonStatCard key={i} />)}
                </div>
              ) : suggestions.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {suggestions.slice(0, 4).map((s: any, i: number) => (
                    <div key={s.id ?? i} className="card-hover p-4 group cursor-pointer">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-gray-900 leading-snug flex-1">{s.title ?? s.type}</p>
                        <PriorityDot priority={s.priority ?? 'LOW'} />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{s.description ?? s.message}</p>
                      <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                        View details <ArrowUpRight className="w-3 h-3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={Sparkles} message="No suggestions right now. Add inventory to get AI-powered recommendations." />
              )}
            </Section>

            {/* Fruit Alerts */}
            <Section title="Fruit Alerts" icon={Bell} iconClass="bg-orange-100 text-orange-600" href="/fruits">
              {fLoading ? (
                <SkeletonRows n={2} />
              ) : alerts.length > 0 ? (
                <div className="space-y-2.5">
                  {alerts.map((a: any, i: number) => (
                    <div key={a.id ?? i} className={cn(
                      'rounded-xl p-4 border flex items-start gap-3',
                      a.severity === 'HIGH'   ? 'bg-red-50 border-red-200' :
                      a.severity === 'MEDIUM' ? 'bg-orange-50 border-orange-200' :
                                                'bg-yellow-50 border-yellow-200',
                    )}>
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        a.severity === 'HIGH' ? 'bg-red-100' : a.severity === 'MEDIUM' ? 'bg-orange-100' : 'bg-yellow-100',
                      )}>
                        <AlertTriangle className={cn(
                          'w-4 h-4',
                          a.severity === 'HIGH' ? 'text-red-600' : a.severity === 'MEDIUM' ? 'text-orange-600' : 'text-yellow-600',
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{a.fruitName ?? a.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{a.message ?? a.description}</p>
                        {a.ripenessLevel && (
                          <span className="inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 bg-white/80 rounded-full border text-gray-600">
                            {a.ripenessLevel}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty icon={Bell} message="All fruits are in good condition. No alerts!" />
              )}
            </Section>
          </div>

          {/* Right: Today's Meals + Quick Actions */}
          <div className="space-y-6">

            {/* Today's Meals */}
            <Section title="Today's Meals" icon={Utensils} iconClass="bg-emerald-100 text-emerald-600" href="/meal-planner" hrefLabel="Plan">
              {mLoading ? (
                <SkeletonRows n={3} />
              ) : meals.length > 0 ? (
                <div className="space-y-2.5">
                  {meals.map((meal: any) => {
                    const mealTypeColors: Record<string, string> = {
                      BREAKFAST: 'bg-yellow-100 text-yellow-700',
                      LUNCH:     'bg-blue-100 text-blue-700',
                      DINNER:    'bg-purple-100 text-purple-700',
                      SNACK:     'bg-pink-100 text-pink-700',
                    };
                    const typeColor = mealTypeColors[meal.mealType] ?? 'bg-gray-100 text-gray-600';

                    return (
                      <div key={meal.id} className="card-hover p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {meal.recipe?.name ?? meal.customMealName ?? 'Unnamed Meal'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', typeColor)}>
                                {meal.mealType?.toLowerCase()}
                              </span>
                              <span className="text-[11px] text-gray-400">{meal.servings} servings</span>
                            </div>
                          </div>
                          <MealBadge status={meal.status ?? 'PLANNED'} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty icon={Utensils} message="No meals planned today." cta="Add meals" ctaHref="/meal-planner" />
              )}
            </Section>

            {/* Quick Actions */}
            <section>
              <h2 className="section-title mb-3.5">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction href="/inventory"    label="Add Grocery"     icon={Plus}         gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                <QuickAction href="/meal-planner" label="Plan Meals"      icon={Calendar}     gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                <QuickAction href="/shopping"     label="Shopping List"   icon={ShoppingCart} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                <QuickAction href="/waste"        label="Log Waste"       icon={Trash2}       gradient="bg-gradient-to-br from-red-500 to-rose-600" />
              </div>
            </section>

            {/* Mini chart placeholder / stats strip */}
            <section>
              <Link href="/analytics" className="block card-hover p-4 bg-gradient-to-br from-slate-800 to-slate-900">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Analytics</p>
                    <p className="text-sm font-bold text-white mt-0.5">View full report</p>
                  </div>
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex items-end gap-1 h-10">
                  {[4, 7, 5, 8, 6, 9, 7, 10, 8, 6, 9, 11].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-emerald-500/60 transition-all"
                      style={{ height: `${(h / 11) * 100}%` }}
                    />
                  ))}
                </div>
              </Link>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
