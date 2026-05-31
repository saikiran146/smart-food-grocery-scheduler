'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Package,
  Wallet,
  TrendingDown,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { analyticsApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

type DateRange = '7d' | '30d' | '90d' | '1y';
type TabId = 'overview' | 'inventory' | 'meals' | 'spending';

const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '90d', label: '90d' },
  { key: '1y', label: '1y' },
];

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'meals', label: 'Meals' },
  { id: 'spending', label: 'Spending' },
];

// ─── Mock / Fallback Data ─────────────────────────────────────────────────────

const SPENDING_DATA = [
  { month: 'Jan', amount: 2400 },
  { month: 'Feb', amount: 1800 },
  { month: 'Mar', amount: 2800 },
  { month: 'Apr', amount: 2200 },
  { month: 'May', amount: 3200 },
  { month: 'Jun', amount: 2600 },
];

const SPENDING_BY_CATEGORY = [
  { category: 'Vegetables', amount: 860 },
  { category: 'Dairy', amount: 480 },
  { category: 'Meat', amount: 720 },
  { category: 'Spices', amount: 240 },
  { category: 'Snacks', amount: 300 },
];

const INVENTORY_BY_CATEGORY = [
  { category: 'Vegetables', items: 18 },
  { category: 'Dairy', items: 8 },
  { category: 'Meat', items: 5 },
  { category: 'Spices', items: 22 },
  { category: 'Rice & Grains', items: 10 },
  { category: 'Snacks', items: 6 },
];

const PIE_CATEGORY_DATA = [
  { name: 'Vegetables', value: 28 },
  { name: 'Dairy', value: 14 },
  { name: 'Meat', value: 12 },
  { name: 'Spices', value: 20 },
  { name: 'Snacks', value: 10 },
  { name: 'Other', value: 16 },
];

const MEALS_PER_WEEK = [
  { week: 'Week 1', meals: 14 },
  { week: 'Week 2', meals: 18 },
  { week: 'Week 3', meals: 16 },
  { week: 'Week 4', meals: 20 },
];

const MEAL_TYPE_DATA = [
  { name: 'Breakfast', value: 28 },
  { name: 'Lunch', value: 34 },
  { name: 'Dinner', value: 30 },
  { name: 'Snack', value: 8 },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function GlassTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/90 backdrop-blur border border-gray-100 rounded-xl shadow-lg px-3 py-2">
      {label && <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-xs text-gray-600">
          <span style={{ color: p.color || p.fill }} className="font-semibold">
            {p.name ?? p.dataKey}:{' '}
          </span>
          {currency ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="stat-card animate-shimmer h-32" />
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="card p-6">
      <div className="skeleton h-5 w-40 mb-4" />
      <div className="animate-shimmer rounded-xl" style={{ height }} />
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

const STAT_COLOR_MAP = {
  blue: {
    icon: 'bg-blue-50 text-blue-600',
    badge: 'text-blue-500',
    accent: 'bg-blue-500',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600',
    badge: 'text-emerald-500',
    accent: 'bg-emerald-500',
  },
  red: {
    icon: 'bg-red-50 text-red-600',
    badge: 'text-red-500',
    accent: 'bg-red-500',
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600',
    badge: 'text-purple-500',
    accent: 'bg-purple-500',
  },
};

type StatColor = keyof typeof STAT_COLOR_MAP;

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: StatColor;
  index: number;
}) {
  const colors = STAT_COLOR_MAP[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 300, damping: 24 }}
      className="stat-card group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn('w-1.5 h-8 rounded-full opacity-20 group-hover:opacity-60 transition-opacity', colors.accent)} />
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ dashboard }: { dashboard: any }) {
  const spendingData = SPENDING_DATA;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart — Monthly Spending */}
        <div className="card p-6 lg:col-span-2">
          <h3 className="section-title mb-4">Monthly Spending</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={spendingData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₹${v / 1000}k`}
              />
              <Tooltip content={<GlassTooltip currency />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#colorAmount)"
                dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart — Inventory by Category */}
        <div className="card p-6">
          <h3 className="section-title mb-4">Inventory Mix</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={PIE_CATEGORY_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {PIE_CATEGORY_DATA.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {PIE_CATEGORY_DATA.slice(0, 4).map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-xs text-gray-600">{d.name}</span>
                </div>
                <span className="text-xs font-semibold text-gray-700">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ dashboard }: { dashboard: any }) {
  const totalItems = dashboard?.inventory?.totalItems ?? 0;
  const totalValue = dashboard?.inventory?.totalValue ?? 0;
  const expiringSoon = dashboard?.inventory?.expiringSoonCount ?? dashboard?.inventory?.expiringSoon ?? 0;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Items', value: totalItems || 69, sub: 'in stock', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Value', value: totalValue ? formatCurrency(totalValue) : '₹4,820', sub: 'estimated', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Expiring Soon', value: expiringSoon || 4, sub: 'within 7 days', color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className="card p-5 text-center">
            <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Items by Category</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={INVENTORY_BY_CATEGORY}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
          >
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="category"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<GlassTooltip />} />
            <Bar dataKey="items" radius={[0, 6, 6, 0]} fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Expiring Soon List */}
      <div className="card p-6">
        <h3 className="section-title mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Expiring Soon
        </h3>
        {[
          { name: 'Spinach', days: 1, category: 'Vegetables' },
          { name: 'Paneer', days: 2, category: 'Dairy' },
          { name: 'Tomatoes', days: 3, category: 'Vegetables' },
          { name: 'Yogurt', days: 4, category: 'Dairy' },
          { name: 'Chicken Breast', days: 5, category: 'Meat' },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-400">{item.category}</p>
            </div>
            <span
              className={cn(
                'badge',
                item.days <= 2 ? 'badge-red' : item.days <= 4 ? 'badge-orange' : 'badge-amber'
              )}
            >
              {item.days}d left
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Meals Tab ────────────────────────────────────────────────────────────────

function MealsTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line chart — meals per week */}
        <div className="card p-6">
          <h3 className="section-title mb-4">Meals per Week</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={MEALS_PER_WEEK} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<GlassTooltip />} />
              <Line
                type="monotone"
                dataKey="meals"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Donut — meal type breakdown */}
        <div className="card p-6">
          <h3 className="section-title mb-4">Meal Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={MEAL_TYPE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {MEAL_TYPE_DATA.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<GlassTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {MEAL_TYPE_DATA.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-xs text-gray-600">
                  {d.name} <span className="font-semibold text-gray-800">{d.value}%</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top recipes */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Top Recipes This Month</h3>
        <div className="space-y-0">
          {[
            { name: 'Dal Tadka', count: 8, emoji: '🍛' },
            { name: 'Palak Paneer', count: 6, emoji: '🥗' },
            { name: 'Chicken Curry', count: 5, emoji: '🍗' },
            { name: 'Aloo Gobi', count: 4, emoji: '🥔' },
            { name: 'Rajma Chawal', count: 4, emoji: '🫘' },
          ].map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0"
            >
              <span className="text-gray-400 text-sm font-semibold w-5 text-center">{i + 1}</span>
              <span className="text-xl">{r.emoji}</span>
              <span className="flex-1 text-sm font-medium text-gray-800">{r.name}</span>
              <span className="badge badge-purple">{r.count}x</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Spending Tab ─────────────────────────────────────────────────────────────

function SpendingTab({ dashboard }: { dashboard: any }) {
  const monthlySpend = dashboard?.budget?.monthlySpend ?? 2600;
  const monthlyBudget = dashboard?.budget?.budgetAmount ?? dashboard?.budget?.monthlyBudget ?? 3500;
  const avgPerMeal = Math.round(monthlySpend / 60);
  const avgPerWeek = Math.round(monthlySpend / 4.3);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Avg per Meal', value: formatCurrency(avgPerMeal), sub: 'this month', color: 'text-emerald-600' },
          { label: 'Avg per Week', value: formatCurrency(avgPerWeek), sub: 'last 30 days', color: 'text-blue-600' },
          {
            label: 'Budget Used',
            value: `${monthlyBudget > 0 ? Math.min(100, Math.round((monthlySpend / monthlyBudget) * 100)) : 0}%`,
            sub: `of ${formatCurrency(monthlyBudget)}`,
            color: monthlySpend > monthlyBudget ? 'text-red-600' : 'text-emerald-600',
          },
        ].map((s, i) => (
          <div key={i} className="card p-5 text-center">
            <p className="text-xs font-medium text-gray-500 mb-1">{s.label}</p>
            <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Area chart — spending trend */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Monthly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={SPENDING_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v / 1000}k`}
            />
            <Tooltip content={<GlassTooltip currency />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#spendGrad)"
              dot={{ r: 3, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart — spending by category */}
      <div className="card p-6">
        <h3 className="section-title mb-4">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={SPENDING_BY_CATEGORY} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" />
            <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₹${v}`}
            />
            <Tooltip content={<GlassTooltip currency />} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {SPENDING_BY_CATEGORY.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { selectedFamilyId } = useFamily();
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', selectedFamilyId, dateRange],
    queryFn: () =>
      analyticsApi.getDashboard(selectedFamilyId!).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
    staleTime: 60_000,
  });

  const dashboard = dashboardData ?? {};

  // Derived stat card values
  const totalItems = dashboard?.inventory?.totalItems ?? 0;
  const monthlySpend = dashboard?.budget?.monthlySpend ?? dashboard?.spending?.monthly ?? 0;
  const wasteAmount = dashboard?.waste?.monthlyWasteValue ?? dashboard?.waste?.totalCost ?? 0;
  const mealsPlanned = dashboard?.meals?.totalMeals ?? dashboard?.meals?.count ?? 0;

  if (!selectedFamilyId) {
    return (
      <div>
        <Header title="Analytics" description="Track your family's food insights" />
        <div className="flex flex-col items-center justify-center py-32 text-center px-6">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-lg font-semibold text-gray-700">No family selected</p>
          <p className="text-sm text-gray-400 mt-1">Please select a family to view analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Analytics" description="Executive insights for your family kitchen" />

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Top bar: date range selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            {DATE_RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setDateRange(r.key)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                  dateRange === r.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat Cards (4) */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Inventory Items"
              value={totalItems || 69}
              sub="total in stock"
              icon={Package}
              color="blue"
              index={0}
            />
            <StatCard
              label="Monthly Spending"
              value={monthlySpend ? formatCurrency(monthlySpend) : '₹2,600'}
              sub="this month"
              icon={Wallet}
              color="emerald"
              index={1}
            />
            <StatCard
              label="Waste This Month"
              value={wasteAmount ? formatCurrency(wasteAmount) : '₹340'}
              sub="food wasted"
              icon={TrendingDown}
              color="red"
              index={2}
            />
            <StatCard
              label="Meals Planned"
              value={mealsPlanned || 42}
              sub="this month"
              icon={CalendarDays}
              color="purple"
              index={3}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit border border-gray-200/60">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-5 py-2 text-sm rounded-lg font-semibold transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartSkeleton height={280} />
                <ChartSkeleton height={280} />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab dashboard={dashboard} />}
              {activeTab === 'inventory' && <InventoryTab dashboard={dashboard} />}
              {activeTab === 'meals' && <MealsTab />}
              {activeTab === 'spending' && <SpendingTab dashboard={dashboard} />}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
