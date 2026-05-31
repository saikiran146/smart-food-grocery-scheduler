'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { shoppingApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency } from '@/lib/utils/format';
import { UNITS } from '@/lib/constants';
import { Plus, ChevronDown, ChevronUp, Zap, CheckCircle, Circle, Trash2, X } from 'lucide-react';

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedCost?: number;
  isPurchased: boolean;
}

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  budget?: number;
  isCompleted: boolean;
  totalEstimatedCost?: number;
  items: ShoppingItem[];
  createdAt: string;
}

interface NewListForm {
  name: string;
  description: string;
  budget: string;
}

interface NewItemForm {
  name: string;
  quantity: string;
  unit: string;
  estimatedCost: string;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShoppingPage() {
  const { selectedFamilyId } = useFamily();
  const queryClient = useQueryClient();
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListForm, setNewListForm] = useState<NewListForm>({ name: '', description: '', budget: '' });
  const [newItemForms, setNewItemForms] = useState<Record<string, NewItemForm>>({});

  const { data: listsData, isLoading } = useQuery({
    queryKey: ['shopping-lists', selectedFamilyId],
    queryFn: () => shoppingApi.list(selectedFamilyId!).then((r) => r.data.data),
    enabled: !!selectedFamilyId,
  });

  const lists: ShoppingList[] = listsData || [];

  const createListMutation = useMutation({
    mutationFn: (data: any) => shoppingApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setShowNewListModal(false);
      setNewListForm({ name: '', description: '', budget: '' });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => shoppingApi.generate(selectedFamilyId!, 7),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ listId, itemId, data }: { listId: string; itemId: string; data: any }) =>
      shoppingApi.updateItem(listId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: any }) =>
      shoppingApi.addItem(listId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setNewItemForms((prev) => ({ ...prev, [vars.listId]: { name: '', quantity: '', unit: 'KG', estimatedCost: '' } }));
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      shoppingApi.removeItem(listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const completeListMutation = useMutation({
    mutationFn: (listId: string) => shoppingApi.complete(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: (listId: string) => shoppingApi.delete(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  function handleCreateList() {
    if (!newListForm.name.trim() || !selectedFamilyId) return;
    createListMutation.mutate({
      name: newListForm.name,
      description: newListForm.description || undefined,
      budget: newListForm.budget ? parseFloat(newListForm.budget) : undefined,
      familyId: selectedFamilyId,
    });
  }

  function handleAddItem(listId: string) {
    const form = newItemForms[listId];
    if (!form?.name.trim()) return;
    addItemMutation.mutate({
      listId,
      data: {
        name: form.name,
        quantity: parseFloat(form.quantity) || 1,
        unit: form.unit || 'PIECES',
        estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      },
    });
  }

  function getItemForm(listId: string): NewItemForm {
    return newItemForms[listId] || { name: '', quantity: '', unit: 'PIECES', estimatedCost: '' };
  }

  function setItemForm(listId: string, updates: Partial<NewItemForm>) {
    setNewItemForms((prev) => ({
      ...prev,
      [listId]: { ...getItemForm(listId), ...updates },
    }));
  }

  if (!selectedFamilyId) {
    return (
      <div>
        <Header title="Shopping Lists" description="Manage your grocery shopping lists" />
        <div className="p-6 text-center text-gray-500 mt-12">Please select a family to view shopping lists.</div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Shopping Lists" description="Manage your grocery shopping lists" />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewListModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            New List
          </button>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            {generateMutation.isPending ? 'Generating...' : 'Auto-Generate'}
          </button>
        </div>

        {/* Shopping Lists */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : lists.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-lg font-medium text-gray-500">No shopping lists yet</p>
            <p className="text-sm mt-1">Create a new list or auto-generate from your meal plan</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lists.map((list) => {
              const isExpanded = expandedListId === list.id;
              const allPurchased = list.items.length > 0 && list.items.every((i) => i.isPurchased);
              const purchasedCount = list.items.filter((i) => i.isPurchased).length;

              return (
                <div key={list.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* List Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 text-lg">{list.name}</h3>
                          {list.isCompleted && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Completed
                            </span>
                          )}
                        </div>
                        {list.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{list.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>{list.items.length} items</span>
                          {list.totalEstimatedCost != null && (
                            <span>{formatCurrency(list.totalEstimatedCost)} est.</span>
                          )}
                          {list.budget && (
                            <span>Budget: {formatCurrency(list.budget)}</span>
                          )}
                          {list.items.length > 0 && (
                            <span>{purchasedCount}/{list.items.length} checked</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {!list.isCompleted && allPurchased && list.items.length > 0 && (
                          <button
                            onClick={() => completeListMutation.mutate(list.id)}
                            disabled={completeListMutation.isPending}
                            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                          >
                            Complete List
                          </button>
                        )}
                        <button
                          onClick={() => deleteListMutation.mutate(list.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedListId(isExpanded ? null : list.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {list.items.length > 0 && (
                      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full transition-all"
                          style={{ width: `${(purchasedCount / list.items.length) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {list.items.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-gray-400">No items yet. Add some below.</div>
                      ) : (
                        <ul className="divide-y divide-gray-50">
                          {list.items.map((item) => (
                            <li key={item.id} className="px-5 py-3 flex items-center gap-3">
                              <button
                                onClick={() =>
                                  updateItemMutation.mutate({
                                    listId: list.id,
                                    itemId: item.id,
                                    data: { isPurchased: !item.isPurchased },
                                  })
                                }
                                className="flex-shrink-0 text-gray-400 hover:text-green-500 transition-colors"
                              >
                                {item.isPurchased ? (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                ) : (
                                  <Circle className="w-5 h-5" />
                                )}
                              </button>
                              <span
                                className={`flex-1 text-sm font-medium ${
                                  item.isPurchased ? 'line-through text-gray-400' : 'text-gray-800'
                                }`}
                              >
                                {item.name}
                              </span>
                              <span className="text-sm text-gray-500">
                                {item.quantity} {item.unit}
                              </span>
                              {item.estimatedCost != null && (
                                <span className="text-sm text-gray-500">{formatCurrency(item.estimatedCost)}</span>
                              )}
                              <button
                                onClick={() => removeItemMutation.mutate({ listId: list.id, itemId: item.id })}
                                className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Add Item Row */}
                      {!list.isCompleted && (
                        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                          <div className="flex gap-2 flex-wrap">
                            <input
                              type="text"
                              placeholder="Item name"
                              value={getItemForm(list.id).name}
                              onChange={(e) => setItemForm(list.id, { name: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddItem(list.id)}
                              className="flex-1 min-w-32 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <input
                              type="number"
                              placeholder="Qty"
                              value={getItemForm(list.id).quantity}
                              onChange={(e) => setItemForm(list.id, { quantity: e.target.value })}
                              className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <select
                              value={getItemForm(list.id).unit}
                              onChange={(e) => setItemForm(list.id, { unit: e.target.value })}
                              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                              {UNITS.map((u) => (
                                <option key={u.value} value={u.value}>
                                  {u.value}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              placeholder="Cost (₹)"
                              value={getItemForm(list.id).estimatedCost}
                              onChange={(e) => setItemForm(list.id, { estimatedCost: e.target.value })}
                              className="w-28 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <button
                              onClick={() => handleAddItem(list.id)}
                              disabled={addItemMutation.isPending}
                              className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-4 h-4" />
                              Add
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New List Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Create New Shopping List</h2>
              <button onClick={() => setShowNewListModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newListForm.name}
                  onChange={(e) => setNewListForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Weekly Groceries"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newListForm.description}
                  onChange={(e) => setNewListForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (₹)</label>
                <input
                  type="number"
                  value={newListForm.budget}
                  onChange={(e) => setNewListForm((p) => ({ ...p, budget: e.target.value }))}
                  placeholder="e.g., 2000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowNewListModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListForm.name.trim() || createListMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {createListMutation.isPending ? 'Creating...' : 'Create List'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
