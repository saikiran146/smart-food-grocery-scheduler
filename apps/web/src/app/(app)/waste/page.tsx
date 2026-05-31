'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { wasteApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { GROCERY_CATEGORIES, WASTE_CATEGORIES, UNITS } from '@/lib/constants';
import { Plus, X, Trash2, Filter } from 'lucide-react';

interface WasteLog {
  id: string;
  itemName: string;
  category: string;
  wasteCategory: string;
  quantity: number;
  unit: string;
  costWasted?: number;
  reason?: string;
  wastedAt: string;
}

interface WasteSummary {
  totalWasteCost: number;
  wastePercentage: number;
  mostWastedItem?: string;
  byCategory: { category: string; count: number; cost: number }[];
}

interface LogWasteForm {
  itemName: string;
  category: string;
  wasteCategory: string;
  quantity: string;
  unit: string;
  costWasted: string;
  reason: string;
  wastedAt: string;
}

const today = new Date().toISOString().split('T')[0];

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-8 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 bg-gray-100 rounded mb-2" />
        ))}
      </div>
    </div>
  );
}

function getCategoryInfo(value: string) {
  return GROCERY_CATEGORIES.find((c) => c.value === value);
}

function getWasteCategoryInfo(value: string) {
  return WASTE_CATEGORIES.find((c) => c.value === value);
}

export default function WastePage() {
  const { selectedFamilyId } = useFamily();
  const queryClient = useQueryClient();
  const [showLogModal, setShowLogModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [form, setForm] = useState<LogWasteForm>({
    itemName: '',
    category: '',
    wasteCategory: '',
    quantity: '',
    unit: 'KG',
    costWasted: '',
    reason: '',
    wastedAt: today,
  });

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: wasteLogsData, isLoading: logsLoading } = useQuery({
    queryKey: ['waste-logs', selectedFamilyId, filterCategory, filterFrom, filterTo],
    queryFn: () =>
      wasteApi
        .list({
          familyId: selectedFamilyId,
          category: filterCategory || undefined,
          from: filterFrom || undefined,
          to: filterTo || undefined,
        })
        .then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['waste-summary', selectedFamilyId, currentMonth, currentYear],
    queryFn: () =>
      wasteApi.getSummary(selectedFamilyId!, currentMonth, currentYear).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  const logWasteMutation = useMutation({
    mutationFn: (data: any) => wasteApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste-summary'] });
      setShowLogModal(false);
      setForm({
        itemName: '',
        category: '',
        wasteCategory: '',
        quantity: '',
        unit: 'KG',
        costWasted: '',
        reason: '',
        wastedAt: today,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wasteApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste-logs'] });
      queryClient.invalidateQueries({ queryKey: ['waste-summary'] });
    },
  });

  function handleSubmit() {
    if (!form.itemName.trim() || !form.category || !form.wasteCategory || !selectedFamilyId) return;
    logWasteMutation.mutate({
      familyId: selectedFamilyId,
      itemName: form.itemName,
      category: form.category,
      wasteCategory: form.wasteCategory,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      costWasted: form.costWasted ? parseFloat(form.costWasted) : undefined,
      reason: form.reason || undefined,
      wastedAt: form.wastedAt || today,
    });
  }

  const logs: WasteLog[] = wasteLogsData || [];
  const summary: WasteSummary = summaryData || {
    totalWasteCost: 0,
    wastePercentage: 0,
    mostWastedItem: undefined,
    byCategory: [],
  };

  const maxCategoryCost = Math.max(...(summary.byCategory || []).map((c) => c.cost), 1);

  if (!selectedFamilyId) {
    return (
      <div>
        <Header title="Waste Tracker" description="Track and reduce food waste" />
        <div className="p-6 text-center text-gray-500 mt-12">Please select a family to view waste data.</div>
      </div>
    );
  }

  const isLoading = logsLoading || summaryLoading;

  return (
    <div>
      <Header title="Waste Tracker" description="Track and reduce food waste" />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Summary Cards */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Monthly Waste %</p>
                <p
                  className={`text-3xl font-bold ${
                    summary.wastePercentage > 20
                      ? 'text-red-600'
                      : summary.wastePercentage > 10
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`}
                >
                  {summary.wastePercentage?.toFixed(1) ?? '0.0'}%
                </p>
                <p className="text-xs text-gray-400 mt-1">of total inventory value</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Total Waste Cost</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatCurrency(summary.totalWasteCost || 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">this month</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-sm text-gray-500 mb-1">Most Wasted Item</p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {summary.mostWastedItem || '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">highest frequency</p>
              </div>
            </div>

            {/* Waste by Category Chart */}
            {summary.byCategory && summary.byCategory.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Waste by Category</h3>
                <div className="space-y-3">
                  {summary.byCategory.map((cat) => {
                    const info = getCategoryInfo(cat.category);
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">
                            {info?.emoji} {info?.label || cat.category}
                          </span>
                          <span className="text-sm font-medium text-gray-600">
                            {formatCurrency(cat.cost)} ({cat.count} items)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full transition-all"
                            style={{ width: `${(cat.cost / maxCategoryCost) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters + Log Button */}
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4" />
                Log Waste
              </button>
              <div className="flex items-center gap-2 text-gray-500">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">All Categories</option>
                {GROCERY_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="From"
              />
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="To"
              />
              {(filterCategory || filterFrom || filterTo) && (
                <button
                  onClick={() => { setFilterCategory(''); setFilterFrom(''); setFilterTo(''); }}
                  className="text-sm text-gray-500 hover:text-gray-800 underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Waste Log Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Waste Log</h3>
              </div>
              {logs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-4xl mb-3">♻️</div>
                  <p className="text-sm">No waste logged yet. Keep it up!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <th className="px-5 py-3 text-left">Date</th>
                        <th className="px-5 py-3 text-left">Item</th>
                        <th className="px-5 py-3 text-left">Category</th>
                        <th className="px-5 py-3 text-left">Reason</th>
                        <th className="px-5 py-3 text-left">Quantity</th>
                        <th className="px-5 py-3 text-left">Cost</th>
                        <th className="px-5 py-3 text-left"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {logs.map((log) => {
                        const catInfo = getCategoryInfo(log.category);
                        const wasteInfo = getWasteCategoryInfo(log.wasteCategory);
                        return (
                          <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                              {formatDate(log.wastedAt)}
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-900">{log.itemName}</td>
                            <td className="px-5 py-3 text-gray-600">
                              {catInfo?.emoji} {catInfo?.label || log.category}
                            </td>
                            <td className="px-5 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700">
                                {wasteInfo?.emoji} {wasteInfo?.label || log.wasteCategory}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {log.quantity} {log.unit}
                            </td>
                            <td className="px-5 py-3 text-gray-600">
                              {log.costWasted != null ? formatCurrency(log.costWasted) : '—'}
                            </td>
                            <td className="px-5 py-3">
                              <button
                                onClick={() => deleteMutation.mutate(log.id)}
                                className="text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Log Waste Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Log Food Waste</h2>
              <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.itemName}
                  onChange={(e) => setForm((p) => ({ ...p, itemName: e.target.value }))}
                  placeholder="e.g., Tomatoes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  >
                    <option value="">Select category</option>
                    {GROCERY_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Waste Reason <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.wasteCategory}
                    onChange={(e) => setForm((p) => ({ ...p, wasteCategory: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  >
                    <option value="">Select reason</option>
                    {WASTE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder="0"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  >
                    {UNITS.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Wasted (₹)</label>
                  <input
                    type="number"
                    value={form.costWasted}
                    onChange={(e) => setForm((p) => ({ ...p, costWasted: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Wasted</label>
                  <input
                    type="date"
                    value={form.wastedAt}
                    onChange={(e) => setForm((p) => ({ ...p, wastedAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Any additional details about why this was wasted..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.itemName.trim() || !form.category || !form.wasteCategory || logWasteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {logWasteMutation.isPending ? 'Logging...' : 'Log Waste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
