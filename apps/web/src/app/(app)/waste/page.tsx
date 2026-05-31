'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import {
  Plus, Trash2, X, TrendingDown, DollarSign,
  Calendar, Tag, AlertCircle, Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Header } from '@/components/layout/Header';
import { wasteApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { GROCERY_CATEGORIES, WASTE_CATEGORIES, UNITS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WasteLog {
  id: string;
  groceryItemName: string;
  quantity: number;
  unit: string;
  reason?: string;
  category: string;
  estimatedCost?: number;
  wastedAt: string;
  createdAt: string;
}

interface WasteFormData {
  groceryItemName: string;
  quantity: string;
  unit: string;
  reason: string;
  category: string;
  estimatedCost: string;
  wastedAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split('T')[0];

const mockMonthly = [
  { month: 'Jan', cost: 280 },
  { month: 'Feb', cost: 180 },
  { month: 'Mar', cost: 350 },
  { month: 'Apr', cost: 220 },
  { month: 'May', cost: 290 },
  { month: 'Jun', cost: 160 },
];

const WASTE_REASON_OPTIONS = [
  { value: 'FORGOT',      label: 'Forgot About It' },
  { value: 'EXPIRED',     label: 'Expired' },
  { value: 'OVERCOOKED',  label: 'Overcooked' },
  { value: 'DISLIKED',    label: 'Disliked' },
  { value: 'DAMAGED',     label: 'Damaged' },
  { value: 'OTHER',       label: 'Other' },
];

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
};

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, height: 0, marginBottom: 0, overflow: 'hidden', transition: { duration: 0.22 } },
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-red-600 font-bold">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="card p-5 animate-pulse space-y-3">
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton h-8 w-32 rounded" />
      <div className="skeleton h-2.5 w-20 rounded" />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

function StatCard({ label, value, sub, icon: Icon, iconBg, iconColor }: StatCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.10)' }}
      className="card p-5 transition-shadow duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2 leading-none">{value}</p>
          <p className="text-xs text-gray-400 mt-1.5">{sub}</p>
        </div>
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const info = GROCERY_CATEGORIES.find((c) => c.value === category);
  const colorMap: Record<string, string> = {
    green:  'badge-green',
    blue:   'badge-blue',
    red:    'badge-red',
    orange: 'badge-orange',
    yellow: 'badge-amber',
    purple: 'badge-purple',
    gray:   'badge-gray',
  };
  const cls = info ? (colorMap[info.color] ?? 'badge-gray') : 'badge-gray';
  return (
    <span className={cn('badge', cls)}>
      {info?.emoji} {info?.label ?? category}
    </span>
  );
}

// ─── Waste Page ───────────────────────────────────────────────────────────────

export default function WastePage() {
  const { selectedFamilyId } = useFamily();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<WasteFormData>({
    groceryItemName: '',
    quantity: '',
    unit: 'KG',
    reason: '',
    category: '',
    estimatedCost: '',
    wastedAt: today,
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // ── Queries ──

  const { data: logsRaw, isLoading: logsLoading } = useQuery({
    queryKey: ['waste-logs', selectedFamilyId],
    queryFn: () => wasteApi.list({ familyId: selectedFamilyId }).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  const { data: summaryRaw, isLoading: summaryLoading } = useQuery({
    queryKey: ['waste-summary', selectedFamilyId, currentMonth, currentYear],
    queryFn: () =>
      wasteApi.getSummary(selectedFamilyId!, currentMonth, currentYear).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: (data: any) => wasteApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste-summary'] });
      toast.success('Waste logged successfully');
      setDrawerOpen(false);
      setForm({
        groceryItemName: '',
        quantity: '',
        unit: 'KG',
        reason: '',
        category: '',
        estimatedCost: '',
        wastedAt: today,
      });
    },
    onError: () => toast.error('Failed to log waste'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wasteApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste-summary'] });
      toast.success('Entry deleted');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('Failed to delete entry');
      setDeletingId(null);
    },
  });

  function handleSubmit() {
    if (!form.groceryItemName.trim() || !form.category || !selectedFamilyId) {
      toast.error('Please fill in the required fields');
      return;
    }
    createMutation.mutate({
      familyId: selectedFamilyId,
      groceryItemName: form.groceryItemName.trim(),
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      reason: form.reason || undefined,
      category: form.category,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      wastedAt: form.wastedAt || today,
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate(id);
  }

  // ── Derived data ──

  const logs: WasteLog[] = Array.isArray(logsRaw) ? logsRaw.slice(0, 10) : [];
  const summary = summaryRaw ?? {};

  const totalEvents  = logs.length;
  const totalCost    = summary?.totalWasteCost ?? logs.reduce((s, l) => s + (l.estimatedCost ?? 0), 0);
  const monthCost    = summary?.monthlyWasteCost ?? summary?.totalWasteCost ?? 0;
  const topCategory  = (() => {
    const byCat = summary?.wasteByCategory ?? summary?.byCategory ?? [];
    if (byCat.length > 0) return byCat[0]?.category ?? '—';
    if (logs.length === 0) return '—';
    const freq: Record<string, number> = {};
    logs.forEach((l) => { freq[l.category] = (freq[l.category] ?? 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  })();

  const monthlyChartData = (() => {
    const monthly = summary?.monthlyTrend ?? summary?.monthly ?? null;
    return Array.isArray(monthly) && monthly.length > 0 ? monthly : mockMonthly;
  })();

  const categoryChartData = (() => {
    const byCat = summary?.wasteByCategory ?? summary?.byCategory ?? [];
    if (Array.isArray(byCat) && byCat.length > 0) {
      return byCat.map((c: any) => ({ name: c.category, cost: c.cost ?? 0 }));
    }
    return [
      { name: 'VEGETABLES', cost: 120 },
      { name: 'DAIRY',      cost: 80  },
      { name: 'MEAT',       cost: 200 },
      { name: 'BREAD',      cost: 45  },
      { name: 'FRUIT',      cost: 60  },
      { name: 'OTHER',      cost: 30  },
    ];
  })();

  const isLoading = logsLoading || summaryLoading;

  // ── No family ──

  if (!selectedFamilyId) {
    return (
      <>
        <Header title="Waste Tracker" description="Track and reduce food waste" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-orange-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-red-200">
            <TrendingDown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Select a Family</h2>
          <p className="text-gray-500 text-sm max-w-xs">Please select or create a family to track food waste.</p>
        </div>
      </>
    );
  }

  // ── Render ──

  return (
    <>
      <Header title="Waste Tracker" description="Track and reduce food waste in your household" />

      <div className="p-6 max-w-6xl mx-auto space-y-6 pb-32">

        {/* ── Stat cards ── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)}
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <StatCard
              label="Total Events"
              value={totalEvents}
              sub="waste entries logged"
              icon={AlertCircle}
              iconBg="bg-red-100"
              iconColor="text-red-600"
            />
            <StatCard
              label="Total Cost Wasted"
              value={formatCurrency(totalCost)}
              sub="cumulative waste value"
              icon={DollarSign}
              iconBg="bg-orange-100"
              iconColor="text-orange-600"
            />
            <StatCard
              label="This Month's Waste"
              value={formatCurrency(monthCost)}
              sub={format(now, 'MMMM yyyy')}
              icon={Calendar}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
            <StatCard
              label="Most Wasted"
              value={GROCERY_CATEGORIES.find((c) => c.value === topCategory)?.label ?? topCategory}
              sub="highest waste category"
              icon={Tag}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
          </motion.div>
        )}

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Monthly Waste Cost — AreaChart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card p-5 lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="section-title">Monthly Waste Cost</h3>
                <p className="text-xs text-gray-400 mt-0.5">Cost of food wasted per month</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Flame className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wasteAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="55%"  stopColor="#f97316" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fill="url(#wasteAreaGrad)"
                    dot={{ fill: '#ef4444', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5, fill: '#ef4444', strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Waste by Category — BarChart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="card p-5"
          >
            <div className="mb-5">
              <h3 className="section-title">By Category</h3>
              <p className="text-xs text-gray-400 mt-0.5">Waste cost by food type</p>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="wasteGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 10, fill: '#6b7280' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => {
                      const info = GROCERY_CATEGORIES.find((c) => c.value === v);
                      return info ? `${info.emoji} ${info.label.split(' ')[0]}` : v;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs">
                          <p className="font-semibold text-gray-700">{payload[0]?.payload?.name}</p>
                          <p className="text-red-600 font-bold">{formatCurrency(payload[0]?.value as number ?? 0)}</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="cost" radius={[0, 6, 6, 0]} fill="url(#wasteGradient)" maxBarSize={18}>
                    {categoryChartData.map((entry, i) => (
                      <Cell key={i} fill="url(#wasteGradient)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* ── Recent Waste Log ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="card overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="section-title">Recent Waste Log</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 10 entries</p>
            </div>
            <span className="badge badge-gray">{logs.length} entries</span>
          </div>

          {logsLoading ? (
            <div className="divide-y divide-gray-100">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-3 flex-1 rounded" />
                  <div className="skeleton h-5 w-20 rounded-full" />
                  <div className="skeleton h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <TrendingDown className="w-7 h-7 text-green-400" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No waste logged yet</p>
              <p className="text-xs text-gray-400">Great job! Keep your food waste low.</p>
            </div>
          ) : (
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="divide-y divide-gray-100"
            >
              <AnimatePresence mode="popLayout">
                {logs.map((log) => {
                  const catInfo = GROCERY_CATEGORIES.find((c) => c.value === log.category);
                  const reasonLabel = WASTE_REASON_OPTIONS.find((r) => r.value === log.reason)?.label
                    ?? WASTE_CATEGORIES.find((c) => c.value === log.reason)?.label
                    ?? log.reason;
                  return (
                    <motion.div
                      key={log.id}
                      variants={rowVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      layout
                      className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/70 transition-colors group"
                    >
                      {/* Date */}
                      <span className="text-xs text-gray-400 w-24 shrink-0 tabular-nums">
                        {format(new Date(log.wastedAt), 'dd MMM yyyy')}
                      </span>

                      {/* Item */}
                      <span className="font-semibold text-sm text-gray-900 flex-1 truncate min-w-0">
                        {log.groceryItemName}
                      </span>

                      {/* Category */}
                      <span className="shrink-0 hidden sm:block">
                        <CategoryBadge category={log.category} />
                      </span>

                      {/* Quantity */}
                      <span className="text-xs text-gray-500 w-20 shrink-0 text-right tabular-nums">
                        {log.quantity} {log.unit?.toLowerCase()}
                      </span>

                      {/* Cost */}
                      <span className="text-sm font-semibold text-red-600 w-24 shrink-0 text-right tabular-nums">
                        {log.estimatedCost != null ? formatCurrency(log.estimatedCost) : '—'}
                      </span>

                      {/* Reason badge */}
                      {reasonLabel && (
                        <span className="badge badge-gray shrink-0 hidden md:inline-flex">
                          {reasonLabel}
                        </span>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        className={cn(
                          'p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150 shrink-0',
                          deletingId === log.id && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Floating Action Button ── */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 flex items-center justify-center hover:shadow-2xl hover:shadow-emerald-500/40 transition-shadow duration-200"
        aria-label="Log waste"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* ── Slide-over Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />

            {/* Panel */}
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Log Food Waste</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Record wasted food to track patterns</p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                {/* Item Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Item Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.groceryItemName}
                    onChange={(e) => setForm((p) => ({ ...p, groceryItemName: e.target.value }))}
                    placeholder="e.g., Tomatoes, Paneer, Rice..."
                    className="input"
                  />
                </div>

                {/* Quantity + Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Quantity</label>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                      placeholder="0"
                      min="0"
                      step="0.1"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Unit</label>
                    <select
                      value={form.unit}
                      onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                      className="select"
                    >
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Reason + Category */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason</label>
                    <select
                      value={form.reason}
                      onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                      className="select"
                    >
                      <option value="">Select reason</option>
                      {WASTE_REASON_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      className="select"
                    >
                      <option value="">Select category</option>
                      {GROCERY_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estimated Cost + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Estimated Cost (₹)</label>
                    <input
                      type="number"
                      value={form.estimatedCost}
                      onChange={(e) => setForm((p) => ({ ...p, estimatedCost: e.target.value }))}
                      placeholder="0.00"
                      min="0"
                      step="0.5"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date Wasted</label>
                    <input
                      type="date"
                      value={form.wastedAt}
                      onChange={(e) => setForm((p) => ({ ...p, wastedAt: e.target.value }))}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 shrink-0 bg-white">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="btn btn-outline btn-md flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    !form.groceryItemName.trim() ||
                    !form.category ||
                    createMutation.isPending
                  }
                  className="btn btn-primary btn-md flex-1 disabled:opacity-60"
                >
                  {createMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Logging...
                    </span>
                  ) : 'Log Waste'}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
