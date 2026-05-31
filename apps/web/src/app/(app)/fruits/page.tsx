'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { fruitsApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency, formatDate, getDaysUntilExpiry } from '@/lib/utils/format';
import { RIPENESS_LEVELS } from '@/lib/constants';
import { Plus, X, AlertTriangle, Apple, Minus } from 'lucide-react';

interface FruitItem {
  id: string;
  name: string;
  quantity: number;
  originalQuantity: number;
  purchaseDate: string;
  ripenessLevel: string;
  expectedRipeDays: number;
  costPerPiece?: number;
  expectedRipeDate?: string;
}

interface FruitAlert {
  id: string;
  fruitId: string;
  fruitName: string;
  message: string;
  alertType: 'EXPIRING_TODAY' | 'EXPIRING_SOON' | 'OVERRIPE';
}

interface AddFruitForm {
  name: string;
  quantity: string;
  purchaseDate: string;
  ripenessLevel: string;
  expectedRipeDays: string;
  costPerPiece: string;
}

interface ConsumeForm {
  fruitId: string;
  fruitName: string;
  maxQty: number;
  quantity: string;
}

const today = new Date().toISOString().split('T')[0];

function RipenessBadge({ level }: { level: string }) {
  const info = RIPENESS_LEVELS.find((r) => r.value === level);
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${info?.color || 'bg-gray-100 text-gray-700'}`}>
      {info?.label || level}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
          <div className="h-2 bg-gray-100 rounded mb-4" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-gray-200 rounded-lg" />
            <div className="h-8 w-20 bg-gray-100 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function getDaysBadgeColor(days: number) {
  if (days <= 0) return 'bg-red-100 text-red-700';
  if (days <= 2) return 'bg-orange-100 text-orange-700';
  if (days <= 5) return 'bg-yellow-100 text-yellow-700';
  return 'bg-green-100 text-green-700';
}

export default function FruitsPage() {
  const { selectedFamilyId } = useFamily();
  const queryClient = useQueryClient();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [consumeForm, setConsumeForm] = useState<ConsumeForm | null>(null);
  const [updateRipenessTarget, setUpdateRipenessTarget] = useState<{ id: string; name: string; level: string } | null>(null);
  const [addForm, setAddForm] = useState<AddFruitForm>({
    name: '',
    quantity: '',
    purchaseDate: today,
    ripenessLevel: 'UNRIPE',
    expectedRipeDays: '5',
    costPerPiece: '',
  });

  const { data: fruitsData, isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruits', selectedFamilyId],
    queryFn: () => fruitsApi.list(selectedFamilyId!).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  const { data: alertsData } = useQuery({
    queryKey: ['fruit-alerts', selectedFamilyId],
    queryFn: () => fruitsApi.getAlerts(selectedFamilyId!).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
    refetchInterval: 60000,
  });

  const addFruitMutation = useMutation({
    mutationFn: (data: any) => fruitsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fruits'] });
      queryClient.invalidateQueries({ queryKey: ['fruit-alerts'] });
      setShowAddModal(false);
      setAddForm({
        name: '',
        quantity: '',
        purchaseDate: today,
        ripenessLevel: 'UNRIPE',
        expectedRipeDays: '5',
        costPerPiece: '',
      });
    },
  });

  const consumeMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      fruitsApi.consume(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fruits'] });
      queryClient.invalidateQueries({ queryKey: ['fruit-alerts'] });
      setConsumeForm(null);
    },
  });

  const updateRipenessMutation = useMutation({
    mutationFn: ({ id, ripenessLevel }: { id: string; ripenessLevel: string }) =>
      fruitsApi.update(id, { ripenessLevel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fruits'] });
      setUpdateRipenessTarget(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fruitsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fruits'] });
      queryClient.invalidateQueries({ queryKey: ['fruit-alerts'] });
    },
  });

  function handleAddFruit() {
    if (!addForm.name.trim() || !addForm.quantity || !selectedFamilyId) return;
    addFruitMutation.mutate({
      familyId: selectedFamilyId,
      name: addForm.name,
      quantity: parseFloat(addForm.quantity),
      purchaseDate: addForm.purchaseDate,
      ripenessLevel: addForm.ripenessLevel,
      expectedRipeDays: parseInt(addForm.expectedRipeDays) || 5,
      costPerPiece: addForm.costPerPiece ? parseFloat(addForm.costPerPiece) : undefined,
    });
  }

  function handleConsume() {
    if (!consumeForm || !consumeForm.quantity) return;
    const qty = parseFloat(consumeForm.quantity);
    if (qty <= 0 || qty > consumeForm.maxQty) return;
    consumeMutation.mutate({ id: consumeForm.fruitId, quantity: qty });
  }

  const fruits: FruitItem[] = fruitsData || [];
  const alerts: FruitAlert[] = (alertsData || []).filter(
    (a: FruitAlert) => !dismissedAlerts.has(a.id)
  );

  const expiringAlerts = alerts.filter(
    (a) => a.alertType === 'EXPIRING_TODAY' || a.alertType === 'EXPIRING_SOON'
  );
  const overripeAlerts = alerts.filter((a) => a.alertType === 'OVERRIPE');

  if (!selectedFamilyId) {
    return (
      <div>
        <Header title="Fruit Tracker" description="Monitor your fruits and reduce waste" />
        <div className="p-6 text-center text-gray-500 mt-12">Please select a family to view fruit data.</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Fruit Tracker" description="Monitor your fruits and reduce waste" />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Alert Banners */}
        {expiringAlerts.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800 mb-1">
                {expiringAlerts.length} fruit{expiringAlerts.length > 1 ? 's' : ''} expiring soon!
              </p>
              <ul className="text-sm text-orange-700 space-y-0.5">
                {expiringAlerts.map((a) => (
                  <li key={a.id}>{a.message}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setDismissedAlerts((prev) => new Set([...prev, ...expiringAlerts.map((a) => a.id)]))}
              className="text-orange-400 hover:text-orange-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {overripeAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800 mb-1">
                {overripeAlerts.length} fruit{overripeAlerts.length > 1 ? 's are' : ' is'} overripe!
              </p>
              <ul className="text-sm text-red-700 space-y-0.5">
                {overripeAlerts.map((a) => (
                  <li key={a.id}>{a.message}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setDismissedAlerts((prev) => new Set([...prev, ...overripeAlerts.map((a) => a.id)]))}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add Button */}
        <div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Fruit
          </button>
        </div>

        {/* Fruit Grid */}
        {fruitsLoading ? (
          <LoadingSkeleton />
        ) : fruits.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🍎</div>
            <p className="text-lg font-medium text-gray-500">No fruits tracked yet</p>
            <p className="text-sm mt-1">Add fruits to monitor their freshness and prevent waste</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {fruits.map((fruit) => {
              const daysLeft = fruit.expectedRipeDate
                ? getDaysUntilExpiry(fruit.expectedRipeDate)
                : null;
              const progressPct =
                fruit.originalQuantity > 0
                  ? Math.max(0, Math.min(100, (fruit.quantity / fruit.originalQuantity) * 100))
                  : 0;

              return (
                <div key={fruit.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Apple className="w-4 h-4 text-green-500" />
                        <h3 className="font-semibold text-gray-900">{fruit.name}</h3>
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          {fruit.quantity} pcs
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Purchased {formatDate(fruit.purchaseDate)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMutation.mutate(fruit.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <RipenessBadge level={fruit.ripenessLevel} />
                    {daysLeft !== null && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDaysBadgeColor(daysLeft)}`}>
                        {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
                      </span>
                    )}
                    {fruit.costPerPiece != null && (
                      <span className="text-xs text-gray-400">{formatCurrency(fruit.costPerPiece)}/pc</span>
                    )}
                  </div>

                  {/* Quantity Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Remaining</span>
                      <span>{fruit.quantity} / {fruit.originalQuantity || fruit.quantity} pcs</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progressPct > 60 ? 'bg-green-400' : progressPct > 30 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() =>
                        setConsumeForm({
                          fruitId: fruit.id,
                          fruitName: fruit.name,
                          maxQty: fruit.quantity,
                          quantity: '1',
                        })
                      }
                      className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      Consume
                    </button>
                    <button
                      onClick={() =>
                        setUpdateRipenessTarget({
                          id: fruit.id,
                          name: fruit.name,
                          level: fruit.ripenessLevel,
                        })
                      }
                      className="flex-1 px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Ripeness
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Fruit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Add Fruit</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fruit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Bananas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm((p) => ({ ...p, quantity: e.target.value }))}
                    placeholder="0"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Piece (₹)</label>
                  <input
                    type="number"
                    value={addForm.costPerPiece}
                    onChange={(e) => setAddForm((p) => ({ ...p, costPerPiece: e.target.value }))}
                    placeholder="0.00"
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={addForm.purchaseDate}
                    onChange={(e) => setAddForm((p) => ({ ...p, purchaseDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Ripe Days</label>
                  <input
                    type="number"
                    value={addForm.expectedRipeDays}
                    onChange={(e) => setAddForm((p) => ({ ...p, expectedRipeDays: e.target.value }))}
                    placeholder="5"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Ripeness</label>
                <select
                  value={addForm.ripenessLevel}
                  onChange={(e) => setAddForm((p) => ({ ...p, ripenessLevel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  {RIPENESS_LEVELS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleAddFruit}
                disabled={!addForm.name.trim() || !addForm.quantity || addFruitMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {addFruitMutation.isPending ? 'Adding...' : 'Add Fruit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consume Modal */}
      {consumeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Consume {consumeForm.fruitName}</h2>
              <button onClick={() => setConsumeForm(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-500">Available: {consumeForm.maxQty} pieces</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setConsumeForm((p) =>
                      p ? { ...p, quantity: String(Math.max(1, parseInt(p.quantity || '1') - 1)) } : p
                    )
                  }
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={consumeForm.quantity}
                  onChange={(e) => setConsumeForm((p) => p ? { ...p, quantity: e.target.value } : p)}
                  min="1"
                  max={consumeForm.maxQty}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm text-center"
                />
                <button
                  onClick={() =>
                    setConsumeForm((p) =>
                      p
                        ? { ...p, quantity: String(Math.min(p.maxQty, parseInt(p.quantity || '0') + 1)) }
                        : p
                    )
                  }
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setConsumeForm(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleConsume}
                disabled={consumeMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {consumeMutation.isPending ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Ripeness Modal */}
      {updateRipenessTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Update Ripeness</h2>
              <button onClick={() => setUpdateRipenessTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">{updateRipenessTarget.name}</p>
              <div className="grid grid-cols-2 gap-2">
                {RIPENESS_LEVELS.map((r) => (
                  <button
                    key={r.value}
                    onClick={() =>
                      setUpdateRipenessTarget((p) => (p ? { ...p, level: r.value } : p))
                    }
                    className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                      updateRipenessTarget.level === r.value
                        ? 'border-green-500 ' + r.color
                        : 'border-gray-200 ' + r.color + ' opacity-60'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setUpdateRipenessTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={() =>
                  updateRipenessMutation.mutate({
                    id: updateRipenessTarget.id,
                    ripenessLevel: updateRipenessTarget.level,
                  })
                }
                disabled={updateRipenessMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {updateRipenessMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
