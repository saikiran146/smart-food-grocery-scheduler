'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { analyticsApi } from '@/lib/api/endpoints';
import { apiClient } from '@/lib/api/client';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency } from '@/lib/utils/format';
import { GROCERY_CATEGORIES } from '@/lib/constants';
import { TrendingDown, TrendingUp, Package, Flame, Wallet, BarChart2 } from 'lucide-react';

type Tab = 'overview' | 'consumption' | 'waste' | 'budget';

interface AnalyticsDashboard {
  inventory?: {
    totalItems: number;
    totalValue: number;
    expiringSoon: number;
    expired: number;
  };
  consumption?: {
    topItems: { name: string; quantity: number; unit: string }[];
    weeklyUsage: { day: string; value: number }[];
  };
  waste?: {
    monthlyWastePercentage: number;
    wastePercentageTrend: number;
    byCategory: { category: string; value: number; cost: number }[];
    topWastedItems: { name: string; count: number; cost: number }[];
  };
  budget?: {
    monthlyBudget: number;
    monthlySpend: number;
    predictedSpend: number;
    byCategory: { category: string; spend: number }[];
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 bg-gray-100 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function HorizontalBar({ label, value, max, color = 'bg-blue-400', subLabel }: {
  label: string;
  value: number;
  max: number;
  color?: string;
  subLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500">{subLabel}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function getCategoryLabel(value: string) {
  return GROCERY_CATEGORIES.find((c) => c.value === value)?.label || value;
}
function getCategoryEmoji(value: string) {
  return GROCERY_CATEGORIES.find((c) => c.value === value)?.emoji || '';
}

export default function AnalyticsPage() {
  const { selectedFamilyId } = useFamily();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['analytics-dashboard', selectedFamilyId, month, year],
    queryFn: () =>
      apiClient
        .get('/analytics/dashboard', { params: { familyId: selectedFamilyId, month, year } })
        .then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  const { data: consumptionData, isLoading: consumptionLoading } = useQuery({
    queryKey: ['analytics-consumption', selectedFamilyId, month, year],
    queryFn: () => analyticsApi.getConsumption(selectedFamilyId!, month, year).then((r) => r.data.data),
    enabled: !!selectedFamilyId && (activeTab === 'consumption' || activeTab === 'overview'),
  });

  const { data: wasteData, isLoading: wasteLoading } = useQuery({
    queryKey: ['analytics-waste', selectedFamilyId, month, year],
    queryFn: () => analyticsApi.getWaste(selectedFamilyId!, month, year).then((r) => r.data.data),
    enabled: !!selectedFamilyId && (activeTab === 'waste' || activeTab === 'overview'),
  });

  const { data: budgetData, isLoading: budgetLoading } = useQuery({
    queryKey: ['analytics-budget', selectedFamilyId, month, year],
    queryFn: () => analyticsApi.getBudget(selectedFamilyId!, month, year).then((r) => r.data.data),
    enabled: !!selectedFamilyId && (activeTab === 'budget' || activeTab === 'overview'),
  });

  // Normalize backend field names to what the UI expects
  function normalizeInventory(raw: any) {
    if (!raw) return {};
    return {
      totalItems: raw.totalItems,
      totalValue: raw.totalValue,
      expiringSoon: raw.expiringSoonCount ?? raw.expiringSoon,
      expired: raw.expiredCount ?? raw.expired,
    };
  }
  function normalizeConsumption(raw: any) {
    if (!raw) return {};
    return {
      topItems: (raw.topConsumedItems ?? raw.topItems ?? []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit ?? i.category ?? '',
      })),
      weeklyUsage: (raw.weeklyUsageChart ?? raw.weeklyUsage ?? []).map((d: any) => ({
        day: d.date ?? d.day,
        value: d.quantity ?? d.value ?? 0,
      })),
    };
  }
  function normalizeWaste(raw: any) {
    if (!raw) return {};
    return {
      monthlyWastePercentage: raw.wastePercentage ?? raw.monthlyWastePercentage,
      wastePercentageTrend: raw.wastePercentageTrend ?? null,
      byCategory: (raw.wasteByCategory ?? raw.byCategory ?? []).map((c: any) => ({
        category: c.category,
        cost: c.cost ?? c.value ?? 0,
        value: c.quantity ?? c.value ?? 0,
      })),
      topWastedItems: (raw.mostWastedItems ?? raw.topWastedItems ?? []).map((i: any) => ({
        name: i.name,
        count: i.count ?? 1,
        cost: i.cost ?? 0,
      })),
    };
  }
  function normalizeBudget(raw: any) {
    if (!raw) return {};
    return {
      monthlySpend: raw.monthlySpend,
      monthlyBudget: raw.budgetAmount ?? raw.monthlyBudget ?? 0,
      predictedSpend: raw.predictedSpend,
      byCategory: (raw.spendByCategory ?? raw.byCategory ?? []).map((c: any) => ({
        category: c.category,
        spend: c.amount ?? c.spend ?? 0,
      })),
    };
  }

  const dashboard: AnalyticsDashboard = dashboardData || {};
  const rawInventory = (dashboard as any).inventory || {};
  const rawConsumption = (dashboard as any).consumption || consumptionData || {};
  const rawWaste = (dashboard as any).waste || wasteData || {};
  const rawBudget = (dashboard as any).budget || budgetData || {};

  const inventory = normalizeInventory(rawInventory);
  const consumption = normalizeConsumption(rawConsumption);
  const waste = normalizeWaste(rawWaste);
  const budget = normalizeBudget(rawBudget);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'consumption', label: 'Consumption', icon: Flame },
    { id: 'waste', label: 'Waste', icon: TrendingDown },
    { id: 'budget', label: 'Budget', icon: Wallet },
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  if (!selectedFamilyId) {
    return (
      <div>
        <Header title="Analytics" description="Track spending, waste, and consumption patterns" />
        <div className="p-6 text-center text-gray-500 mt-12">Please select a family to view analytics.</div>
      </div>
    );
  }

  // Compute max values for charts
  const maxWeeklyUsage = Math.max(...((consumption.weeklyUsage || []).map((d: any) => d.value)), 1);
  const maxWasteCategory = Math.max(...((waste.byCategory || []).map((c: any) => c.cost)), 1);
  const maxConsumed = Math.max(...((consumption.topItems || []).map((i: any) => i.quantity)), 1);
  const maxBudgetCategory = Math.max(...((budget.byCategory || []).map((c: any) => c.spend)), 1);

  const budgetProgressPct =
    budget.monthlyBudget > 0
      ? Math.min(100, (budget.monthlySpend / budget.monthlyBudget) * 100)
      : 0;

  return (
    <div>
      <Header title="Analytics" description="Track spending, waste, and consumption patterns" />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Month/Year Selector */}
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {monthNames.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors font-medium ${
                  activeTab === tab.id
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Inventory */}
                <div>
                  <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    Inventory
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Items"
                      value={inventory.totalItems ?? '—'}
                      icon={Package}
                      color="blue"
                    />
                    <StatCard
                      label="Total Value"
                      value={inventory.totalValue != null ? formatCurrency(inventory.totalValue) : '—'}
                      icon={Wallet}
                      color="green"
                    />
                    <StatCard
                      label="Expiring Soon"
                      value={inventory.expiringSoon ?? '—'}
                      sub="within 7 days"
                      icon={TrendingDown}
                      color="yellow"
                    />
                    <StatCard
                      label="Expired"
                      value={inventory.expired ?? '—'}
                      icon={TrendingDown}
                      color="red"
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Monthly Waste</p>
                    <div className="flex items-end gap-2 mt-1">
                      <p
                        className={`text-3xl font-bold ${
                          (waste.monthlyWastePercentage ?? 0) > 20
                            ? 'text-red-600'
                            : (waste.monthlyWastePercentage ?? 0) > 10
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {waste.monthlyWastePercentage?.toFixed(1) ?? '0.0'}%
                      </p>
                      {waste.wastePercentageTrend != null && (
                        <span
                          className={`text-sm mb-1 ${
                            waste.wastePercentageTrend < 0 ? 'text-green-500' : 'text-red-500'
                          }`}
                        >
                          {waste.wastePercentageTrend < 0 ? (
                            <TrendingDown className="w-4 h-4 inline" />
                          ) : (
                            <TrendingUp className="w-4 h-4 inline" />
                          )}
                          {Math.abs(waste.wastePercentageTrend).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Monthly Spend</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {budget.monthlySpend != null ? formatCurrency(budget.monthlySpend) : '—'}
                    </p>
                    {budget.monthlyBudget > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        of {formatCurrency(budget.monthlyBudget)} budget
                      </p>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500">Top Consumed</p>
                    <p className="text-xl font-bold text-gray-900 mt-1 truncate">
                      {consumption.topItems?.[0]?.name ?? '—'}
                    </p>
                    {consumption.topItems?.[0] && (
                      <p className="text-xs text-gray-400 mt-1">
                        {consumption.topItems[0].quantity} {consumption.topItems[0].unit}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CONSUMPTION TAB */}
            {activeTab === 'consumption' && (
              <div className="space-y-6">
                {consumptionLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Top Consumed Items</h3>
                      {(consumption.topItems || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No consumption data for this period.</p>
                      ) : (
                        <div className="space-y-3">
                          {(consumption.topItems || []).map((item: any, i: number) => (
                            <HorizontalBar
                              key={i}
                              label={item.name}
                              value={item.quantity}
                              max={maxConsumed}
                              color="bg-blue-400"
                              subLabel={`${item.quantity} ${item.unit}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Weekly Usage</h3>
                      {(consumption.weeklyUsage || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No weekly data available.</p>
                      ) : (
                        <div className="flex items-end gap-2 h-40">
                          {(consumption.weeklyUsage || []).map((day: any, i: number) => {
                            const heightPct = maxWeeklyUsage > 0 ? (day.value / maxWeeklyUsage) * 100 : 0;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex items-end" style={{ height: '120px' }}>
                                  <div
                                    className="w-full bg-blue-400 rounded-t-md transition-all duration-500 hover:bg-blue-500"
                                    style={{ height: `${heightPct}%`, minHeight: day.value > 0 ? '4px' : '0' }}
                                    title={`${day.value}`}
                                  />
                                </div>
                                <span className="text-xs text-gray-500 truncate w-full text-center">{day.day}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* WASTE TAB */}
            {activeTab === 'waste' && (
              <div className="space-y-6">
                {wasteLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    {/* Waste % */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-center gap-6">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Monthly Waste %</p>
                          <p
                            className={`text-5xl font-extrabold ${
                              (waste.monthlyWastePercentage ?? 0) > 20
                                ? 'text-red-600'
                                : (waste.monthlyWastePercentage ?? 0) > 10
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {waste.monthlyWastePercentage?.toFixed(1) ?? '0.0'}%
                          </p>
                        </div>
                        {waste.wastePercentageTrend != null && (
                          <div
                            className={`flex flex-col items-center gap-1 ${
                              waste.wastePercentageTrend < 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {waste.wastePercentageTrend < 0 ? (
                              <TrendingDown className="w-8 h-8" />
                            ) : (
                              <TrendingUp className="w-8 h-8" />
                            )}
                            <span className="text-sm font-semibold">
                              {waste.wastePercentageTrend < 0 ? '' : '+'}
                              {waste.wastePercentageTrend?.toFixed(1)}% vs last month
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Waste by Category */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Waste by Category</h3>
                      {(waste.byCategory || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No waste data for this period.</p>
                      ) : (
                        <div className="space-y-3">
                          {(waste.byCategory || []).map((cat: any, i: number) => (
                            <HorizontalBar
                              key={i}
                              label={`${getCategoryEmoji(cat.category)} ${getCategoryLabel(cat.category)}`}
                              value={cat.cost}
                              max={maxWasteCategory}
                              color="bg-red-400"
                              subLabel={formatCurrency(cat.cost)}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Most Wasted Items */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Most Wasted Items</h3>
                      {(waste.topWastedItems || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No items to show.</p>
                      ) : (
                        <div className="space-y-2">
                          {(waste.topWastedItems || []).map((item: any, i: number) => (
                            <div
                              key={i}
                              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-400 w-5">{i + 1}</span>
                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-red-600">{formatCurrency(item.cost)}</p>
                                <p className="text-xs text-gray-400">{item.count} times</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* BUDGET TAB */}
            {activeTab === 'budget' && (
              <div className="space-y-6">
                {budgetLoading ? (
                  <LoadingSkeleton />
                ) : (
                  <>
                    {/* Spend vs Budget */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Monthly Spend vs Budget</h3>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">
                          Spent: <span className="font-semibold text-gray-900">{formatCurrency(budget.monthlySpend || 0)}</span>
                        </span>
                        <span className="text-gray-600">
                          Budget: <span className="font-semibold text-gray-900">{formatCurrency(budget.monthlyBudget || 0)}</span>
                        </span>
                      </div>
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            budgetProgressPct > 90 ? 'bg-red-500' : budgetProgressPct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${budgetProgressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>0%</span>
                        <span className={budgetProgressPct > 100 ? 'text-red-500 font-medium' : ''}>
                          {budgetProgressPct.toFixed(0)}% used
                        </span>
                        <span>100%</span>
                      </div>
                      {budget.predictedSpend != null && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
                          <TrendingUp className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <span>
                            Predicted month-end spend:{' '}
                            <span className="font-semibold text-gray-900">{formatCurrency(budget.predictedSpend)}</span>
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Spend by Category */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                      <h3 className="font-semibold text-gray-900 mb-4">Spend by Category</h3>
                      {(budget.byCategory || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No budget data for this period.</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-3">
                            {(budget.byCategory || []).map((cat: any, i: number) => (
                              <HorizontalBar
                                key={i}
                                label={`${getCategoryEmoji(cat.category)} ${getCategoryLabel(cat.category)}`}
                                value={cat.spend}
                                max={maxBudgetCategory}
                                color="bg-green-400"
                                subLabel={formatCurrency(cat.spend)}
                              />
                            ))}
                          </div>

                          {/* Donut-style circles for budget categories */}
                          <div className="border-t border-gray-100 pt-4">
                            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">% of Total</p>
                            <div className="flex flex-wrap gap-4">
                              {(budget.byCategory || [])
                                .filter((cat: any) => cat.spend > 0)
                                .map((cat: any, i: number) => {
                                  const total = (budget.byCategory || []).reduce(
                                    (sum: number, c: any) => sum + c.spend,
                                    0
                                  );
                                  const pct = total > 0 ? ((cat.spend / total) * 100).toFixed(0) : '0';
                                  const hue = (i * 50) % 360;
                                  return (
                                    <div key={i} className="flex flex-col items-center gap-1">
                                      <div
                                        className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                        style={{
                                          background: `conic-gradient(hsl(${hue},60%,55%) ${pct}%, #e5e7eb ${pct}%)`,
                                        }}
                                      >
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                          <span className="text-xs font-bold" style={{ color: `hsl(${hue},60%,45%)` }}>
                                            {pct}%
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs text-gray-500 text-center w-16 leading-tight">
                                        {getCategoryEmoji(cat.category)} {getCategoryLabel(cat.category)}
                                      </span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
