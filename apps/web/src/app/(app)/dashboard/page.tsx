'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis,
} from 'recharts';
import {
  Package, TrendingDown, AlertTriangle, IndianRupee,
  Plus, Calendar, ShoppingCart, Trash2, Sparkles, Bell,
  ChevronRight, Utensils, ArrowUpRight, Zap,
} from 'lucide-react';
import { format } from 'date-fns';

import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import { analyticsApi, aiApi, fruitsApi, mealsApi } from '@/lib/api/endpoints';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  accent: 'blue' | 'emerald' | 'orange' | 'red';
  pulseIcon?: boolean;
  delay?: number;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const pageVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const statVariants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.10, ease: [0.16, 1, 0.3, 1] },
  }),
};

// ─── Accent map ───────────────────────────────────────────────────────────────

const accentMap = {
  blue:    { iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    ring: 'ring-blue-200' },
  emerald: { iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', ring: 'ring-emerald-200' },
  orange:  { iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  ring: 'ring-orange-200' },
  red:     { iconBg: 'bg-red-100',     iconColor: 'text-red-500',     ring: 'ring-red-200' },
};

// ─── Skeleton components ──────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <div className="skeleton h-2.5 w-24 rounded" />
          <div className="skeleton h-7 w-20 rounded" />
          <div className="skeleton h-2.5 w-16 rounded" />
        </div>
        <div className="skeleton w-11 h-11 rounded-xl" />
      </div>
    </div>
  );
}

function RowSkeleton({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse flex items-center gap-3">
          <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-3/4 rounded" />
            <div className="skeleton h-2.5 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CardSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card p-4 animate-pulse space-y-2">
          <div className="flex justify-between">
            <div className="skeleton h-3 w-32 rounded" />
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
          <div className="skeleton h-2.5 w-full rounded" />
          <div className="skeleton h-2.5 w-2/3 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent, pulseIcon, delay = 0 }: StatCardProps) {
  const a = accentMap[accent];
  return (
    <motion.div
      custom={delay}
      variants={statVariants}
      whileHover={{ y: -3, boxShadow: '0 10px 28px rgba(0,0,0,0.10)' }}
      className={cn('card p-5 transition-shadow duration-200 cursor-default')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 leading-none tabular-nums">{value}</p>
          <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-inset', a.iconBg, a.ring)}>
          <Icon
            className={cn('w-5 h-5', a.iconColor, pulseIcon && 'animate-pulse')}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === 'HIGH'   ? 'badge-red' :
    priority === 'MEDIUM' ? 'badge-amber' :
                            'badge-green';
  return <span className={cn('badge', cls)}>{priority}</span>;
}

// ─── Quick Action ─────────────────────────────────────────────────────────────

function QuickAction({ href, label, icon: Icon, gradient }: {
  href: string; label: string; icon: React.ElementType; gradient: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.03, boxShadow: '0 8px 20px rgba(0,0,0,0.12)' }}
        whileTap={{ scale: 0.97 }}
        className="card p-4 flex flex-col items-center gap-2.5 cursor-pointer transition-shadow duration-150"
      >
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shadow-sm', gradient)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{label}</span>
      </motion.div>
    </Link>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconCls, href, hrefLabel = 'View all', children }: {
  title: string;
  icon: React.ElementType;
  iconCls: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section variants={fadeUp}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', iconCls)}>
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
    </motion.section>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function Empty({ icon: Icon, message, cta, ctaHref }: {
  icon: React.ElementType;
  message: string;
  cta?: string;
  ctaHref?: string;
}) {
  return (
    <div className="card px-6 py-10 text-center">
      <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Icon className="w-5 h-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {cta && ctaHref && (
        <Link href={ctaHref} className="inline-flex items-center gap-1 mt-3 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> {cta}
        </Link>
      )}
    </div>
  );
}

// ─── No-family State ──────────────────────────────────────────────────────────

function NoFamilyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center min-h-[62vh] text-center px-6"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="w-20 h-20 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-emerald-300/50"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Set up your family</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
        Create or join a family to unlock meal planning, shared inventory, AI-powered recommendations, and waste tracking.
      </p>
      <div className="flex gap-3">
        <Link href="/settings" className="btn btn-primary btn-lg">
          <Plus className="w-4 h-4" /> Create a Family
        </Link>
        <Link href="/settings" className="btn btn-outline btn-lg">Join with Code</Link>
      </div>
    </motion.div>
  );
}

// ─── Mini chart tooltip ───────────────────────────────────────────────────────

function MiniTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white shadow-lg">
      <span className="text-emerald-400 font-bold">{formatCurrency(payload[0]?.value ?? 0)}</span>
    </div>
  );
}

// ─── Greeting helper ──────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Mock 7-day data ──────────────────────────────────────────────────────────

const mock7Day = [
  { day: 'Mon', cost: 120 },
  { day: 'Tue', cost: 85  },
  { day: 'Wed', cost: 200 },
  { day: 'Thu', cost: 60  },
  { day: 'Fri', cost: 140 },
  { day: 'Sat', cost: 95  },
  { day: 'Sun', cost: 170 },
];

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { selectedFamilyId: familyId } = useFamily();
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const greeting = getGreeting();
  const dateLabel = format(new Date(), 'EEEE, MMMM d');

  // ── Queries ──

  const { data: analytics, isLoading: aLoading } = useQuery({
    queryKey: ['analytics-dashboard', familyId],
    queryFn: () => analyticsApi.getDashboard(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: aiSuggestionsRaw, isLoading: sLoading } = useQuery({
    queryKey: ['ai-suggestions', familyId],
    queryFn: () => aiApi.getSuggestions(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: fruitAlertsRaw, isLoading: fLoading } = useQuery({
    queryKey: ['fruit-alerts', familyId],
    queryFn: () => fruitsApi.getAlerts(familyId!).then((r) => r.data.data),
    enabled: !!familyId,
  });

  const { data: todayMealsRaw, isLoading: mLoading } = useQuery({
    queryKey: ['meals-today', familyId, todayStr],
    queryFn: () =>
      mealsApi.list({ familyId, startDate: todayStr, endDate: todayStr }).then((r) => {
        const list = Array.isArray(r.data.data) ? r.data.data : [];
        return list.map((m: any) => ({ ...m, date: m.scheduledAt ?? m.date }));
      }),
    enabled: !!familyId,
  });

  // ── No family ──

  if (!familyId) {
    return (
      <>
        <Header title="Dashboard" description="Your smart food & grocery overview" />
        <NoFamilyState />
      </>
    );
  }

  // ── Derived data ──

  const raw = analytics ?? ({} as any);
  const stats = {
    totalItems: raw.inventory?.totalItems ?? 0,
    totalValue: raw.inventory?.totalValue ?? 0,
    expiring:   raw.inventory?.expiringSoonCount ?? raw.inventory?.expiringSoon ?? 0,
    wasteCost:  raw.waste?.wasteCostThisMonth ?? raw.waste?.monthlyWasteCost ?? 0,
  };

  const suggestions: any[] = Array.isArray(aiSuggestionsRaw) ? aiSuggestionsRaw : [];
  const alerts: any[]      = Array.isArray(fruitAlertsRaw)   ? fruitAlertsRaw   : [];
  const meals: any[]       = Array.isArray(todayMealsRaw)    ? todayMealsRaw    : [];

  const mealTypeConfig: Record<string, { bg: string; label: string }> = {
    BREAKFAST: { bg: 'bg-yellow-100 text-yellow-700', label: 'Breakfast' },
    LUNCH:     { bg: 'bg-blue-100 text-blue-700',     label: 'Lunch'     },
    DINNER:    { bg: 'bg-purple-100 text-purple-700', label: 'Dinner'    },
    SNACK:     { bg: 'bg-pink-100 text-pink-700',     label: 'Snack'     },
  };

  const alertSeverityConfig: Record<string, { card: string; iconBg: string; iconColor: string }> = {
    HIGH:   { card: 'bg-red-50 border-red-200',    iconBg: 'bg-red-100',    iconColor: 'text-red-600'    },
    MEDIUM: { card: 'bg-orange-50 border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    LOW:    { card: 'bg-yellow-50 border-yellow-200', iconBg: 'bg-yellow-100', iconColor: 'text-yellow-600' },
  };

  // ── Render ──

  return (
    <>
      <Header
        title="Dashboard"
        description={`${greeting}! Here's your household overview.`}
      />

      <motion.div
        variants={pageVariants}
        initial="hidden"
        animate="show"
        className="p-6 space-y-7 max-w-7xl"
      >
        {/* ── Greeting + Date ── */}
        <motion.div variants={fadeUp} className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{greeting}!</h2>
            <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Smart kitchen overview</span>
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <AnimatePresence>
          <motion.div
            variants={pageVariants}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            {aLoading ? (
              [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Inventory Items"
                  value={stats.totalItems}
                  sub="items in stock"
                  icon={Package}
                  accent="blue"
                  delay={0}
                />
                <StatCard
                  label="Total Value"
                  value={formatCurrency(stats.totalValue)}
                  sub="estimated inventory worth"
                  icon={IndianRupee}
                  accent="emerald"
                  delay={1}
                />
                <StatCard
                  label="Expiring Soon"
                  value={stats.expiring}
                  sub="within the next 3 days"
                  icon={AlertTriangle}
                  accent="orange"
                  pulseIcon={stats.expiring > 0}
                  delay={2}
                />
                <StatCard
                  label="Waste This Month"
                  value={formatCurrency(stats.wasteCost)}
                  sub="food cost wasted"
                  icon={TrendingDown}
                  accent="red"
                  delay={3}
                />
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── Left: AI + Fruit Alerts ── */}
          <div className="xl:col-span-2 space-y-6">

            {/* AI Suggestions */}
            <Section title="AI Suggestions" icon={Sparkles} iconCls="bg-purple-100 text-purple-600" href="/ai-suggestions">
              {!familyId ? (
                <div className="card px-6 py-10 text-center">
                  <Sparkles className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">Create a family to get AI recommendations</p>
                </div>
              ) : sLoading ? (
                <CardSkeleton n={4} />
              ) : suggestions.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {suggestions.slice(0, 4).map((s: any, i: number) => {
                    const priority: string = s.priority ?? 'LOW';
                    const borderColor =
                      priority === 'HIGH'   ? 'border-l-red-500' :
                      priority === 'MEDIUM' ? 'border-l-amber-500' :
                                              'border-l-emerald-500';
                    return (
                      <motion.div
                        key={s.id ?? i}
                        variants={fadeUp}
                        whileHover={{ y: -2, scale: 1.01, boxShadow: '0 8px 20px rgba(0,0,0,0.09)' }}
                        className={cn('card-hover p-4 border-l-[3px] group', borderColor)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-semibold text-gray-900 leading-snug flex-1 line-clamp-2">
                            {s.title ?? s.type ?? 'AI Tip'}
                          </p>
                          <PriorityBadge priority={priority} />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                          {s.description ?? s.message}
                        </p>
                        <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          View details <ArrowUpRight className="w-3 h-3" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  icon={Sparkles}
                  message="No suggestions right now. Add inventory to get AI-powered recommendations."
                />
              )}
            </Section>

            {/* Fruit Alerts */}
            <Section title="Fruit Alerts" icon={Bell} iconCls="bg-orange-100 text-orange-600" href="/fruits">
              {fLoading ? (
                <RowSkeleton n={2} />
              ) : alerts.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-hide">
                  {alerts.map((a: any, i: number) => {
                    const severity: string = a.severity ?? 'LOW';
                    const cfg = alertSeverityConfig[severity] ?? alertSeverityConfig.LOW;
                    return (
                      <motion.div
                        key={a.id ?? i}
                        variants={fadeUp}
                        className={cn(
                          'rounded-xl p-4 border flex-shrink-0 w-52 flex flex-col gap-2',
                          cfg.card,
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', cfg.iconBg)}>
                            <AlertTriangle className={cn('w-4 h-4', cfg.iconColor)} />
                          </div>
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {a.fruitName ?? a.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 leading-snug line-clamp-2">
                          {a.message ?? a.description}
                        </p>
                        {a.ripenessLevel && (
                          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 bg-white/80 rounded-full border border-white text-gray-600 self-start">
                            {a.ripenessLevel}
                          </span>
                        )}
                        <span className={cn(
                          'badge self-start',
                          severity === 'HIGH' ? 'badge-red' : severity === 'MEDIUM' ? 'badge-orange' : 'badge-amber',
                        )}>
                          {severity}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Empty icon={Bell} message="All fruits are in good condition. No alerts!" />
              )}
            </Section>
          </div>

          {/* ── Right: Meals + Quick Actions + Mini Chart ── */}
          <div className="space-y-6">

            {/* Today's Meals */}
            <Section title="Today's Meals" icon={Utensils} iconCls="bg-emerald-100 text-emerald-600" href="/meal-planner" hrefLabel="Plan">
              {mLoading ? (
                <RowSkeleton n={3} />
              ) : meals.length > 0 ? (
                <div className="space-y-2.5">
                  {meals.map((meal: any) => {
                    const mt = mealTypeConfig[meal.mealType] ?? { bg: 'bg-gray-100 text-gray-600', label: meal.mealType };
                    return (
                      <motion.div key={meal.id} variants={fadeUp} className="card-hover p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {meal.recipe?.name ?? meal.customMealName ?? 'Unnamed Meal'}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', mt.bg)}>
                                {mt.label}
                              </span>
                              {meal.servings && (
                                <span className="text-[11px] text-gray-400">{meal.servings} servings</span>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            'badge shrink-0',
                            meal.status === 'COMPLETED' ? 'badge-green' :
                            meal.status === 'SKIPPED'   ? 'badge-gray'  :
                            meal.status === 'PLANNED'   ? 'badge-blue'  :
                                                          'badge-amber',
                          )}>
                            {meal.status ?? 'PLANNED'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <Empty icon={Utensils} message="No meals planned for today." cta="Plan meals" ctaHref="/meal-planner" />
              )}
            </Section>

            {/* Quick Actions */}
            <motion.section variants={fadeUp}>
              <h2 className="section-title mb-3.5">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <QuickAction href="/inventory"    label="Add Grocery"   icon={Plus}         gradient="bg-gradient-to-br from-emerald-500 to-teal-600" />
                <QuickAction href="/meal-planner" label="Plan Meals"    icon={Calendar}     gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                <QuickAction href="/shopping"     label="Shopping List" icon={ShoppingCart} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
                <QuickAction href="/waste"        label="Log Waste"     icon={Trash2}       gradient="bg-gradient-to-br from-red-500 to-rose-600" />
              </div>
            </motion.section>

            {/* Mini Chart — 7-day overview */}
            <motion.section variants={fadeUp}>
              <div className="card bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Waste Trend</p>
                    <p className="text-sm font-bold text-white mt-0.5">7-day overview</p>
                  </div>
                  <Link
                    href="/waste"
                    className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                  >
                    View analytics <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div style={{ height: 110 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mock7Day} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                      <defs>
                        <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₹${v}`}
                      />
                      <Tooltip content={<MiniTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#miniGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.section>
          </div>
        </div>
      </motion.div>
    </>
  );
}
