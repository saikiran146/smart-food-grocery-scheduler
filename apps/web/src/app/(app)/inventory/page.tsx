'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  ShoppingCart,
  ChevronRight,
  Minus,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import { inventoryApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils/cn';
import {
  formatCurrency,
  formatDate,
  getDaysUntilExpiry,
  isExpired,
  isExpiringSoon,
} from '@/lib/utils/format';
import { GROCERY_CATEGORIES, UNITS, STORAGE_LOCATIONS } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate?: string;
  purchaseDate?: string;
  costPerUnit?: number;
  storageLocation?: string;
  brand?: string;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCategoryMeta = (value: string) =>
  GROCERY_CATEGORIES.find((c) => c.value === value) ?? { emoji: '📦', label: value, color: 'gray' };

const getStorageMeta = (value?: string) =>
  STORAGE_LOCATIONS.find((s) => s.value === value) ?? { emoji: '📦', label: value ?? 'Unknown' };

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;

  const days = getDaysUntilExpiry(expiryDate);
  const expired = isExpired(expiryDate);
  const expiring = isExpiringSoon(expiryDate, 3);
  const soonish = !expired && !expiring && days <= 7;

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
        Expired
      </span>
    );
  }
  if (expiring) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
        {days}d left
      </span>
    );
  }
  if (soonish) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
      {days}d left
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
          <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ─── Grocery Card ─────────────────────────────────────────────────────────────

function GroceryCard({
  item,
  onEdit,
  onDelete,
  onAdjust,
}: {
  item: InventoryItem;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  onAdjust: (item: InventoryItem) => void;
}) {
  const cat = getCategoryMeta(item.category);
  const storage = getStorageMeta(item.storageLocation);
  const expired = item.expiryDate ? isExpired(item.expiryDate) : false;
  const expiring = item.expiryDate ? isExpiringSoon(item.expiryDate, 3) : false;

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-4 border transition-all hover:shadow-md group',
        expired ? 'border-red-200' : expiring ? 'border-orange-200' : 'border-gray-100 hover:border-green-200'
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-gray-50'
          )}
        >
          {cat.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
          {item.brand && <p className="text-xs text-gray-400 truncate">{item.brand}</p>}
        </div>
      </div>

      {/* Quantity + expiry */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {item.quantity} {item.unit.toLowerCase()}
        </span>
        <ExpiryBadge expiryDate={item.expiryDate} />
      </div>

      {/* Storage + cost */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <span>{storage.emoji} {storage.label}</span>
        {item.costPerUnit != null && (
          <>
            <span className="text-gray-300">·</span>
            <span>{formatCurrency(item.costPerUnit)}/unit</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAdjust(item)}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Minus className="w-3 h-3" /> Adjust
        </button>
        <button
          onClick={() => onEdit(item)}
          className="p-1.5 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface GroceryModalProps {
  open: boolean;
  onClose: () => void;
  editItem?: InventoryItem | null;
  familyId: string;
}

const EMPTY_FORM = {
  name: '',
  category: 'VEGETABLES',
  quantity: 1,
  unit: 'KG',
  purchaseDate: '',
  expiryDate: '',
  costPerUnit: '',
  storageLocation: 'PANTRY',
  brand: '',
  notes: '',
};

function GroceryModal({ open, onClose, editItem, familyId }: GroceryModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editItem;

  const [form, setForm] = useState(() =>
    editItem
      ? {
          name: editItem.name,
          category: editItem.category,
          quantity: editItem.quantity,
          unit: editItem.unit,
          purchaseDate: editItem.purchaseDate ?? '',
          expiryDate: editItem.expiryDate ?? '',
          costPerUnit: editItem.costPerUnit != null ? String(editItem.costPerUnit) : '',
          storageLocation: editItem.storageLocation ?? 'PANTRY',
          brand: editItem.brand ?? '',
          notes: editItem.notes ?? '',
        }
      : { ...EMPTY_FORM }
  );

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  const createItem = useMutation({
    mutationFn: (data: any) => inventoryApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); onClose(); },
  });

  const updateItem = useMutation({
    mutationFn: (data: any) => inventoryApi.update(editItem!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      familyId,
      quantity: Number(form.quantity),
      costPerUnit: form.costPerUnit ? Number(form.costPerUnit) : undefined,
      purchaseDate: form.purchaseDate || undefined,
      expiryDate: form.expiryDate || undefined,
    };
    if (isEdit) updateItem.mutate(payload);
    else createItem.mutate(payload);
  };

  const isPending = createItem.isPending || updateItem.isPending;
  const isError = createItem.isError || updateItem.isError;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Grocery' : 'Add Grocery'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Tomatoes"
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {GROCERY_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity + Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
              <input
                type="number"
                min={0}
                step="any"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
              <select
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Purchase Date + Expiry Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => set('purchaseDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Cost + Storage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost per Unit (₹)</label>
              <input
                type="number"
                min={0}
                step="any"
                value={form.costPerUnit}
                onChange={(e) => set('costPerUnit', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Storage Location *</label>
              <select
                value={form.storageLocation}
                onChange={(e) => set('storageLocation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {STORAGE_LOCATIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.emoji} {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
            <input
              type="text"
              value={form.brand}
              onChange={(e) => set('brand', e.target.value)}
              placeholder="e.g. Amul, Tata"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (isEdit ? 'Saving...' : 'Adding...') : isEdit ? 'Save Changes' : 'Add to Inventory'}
          </button>
          {isError && (
            <p className="text-xs text-red-500 text-center">Failed to save. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}

// ─── Adjust Quantity Modal ────────────────────────────────────────────────────

function AdjustModal({
  open,
  item,
  onClose,
}: {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  const adjustItem = useMutation({
    mutationFn: (data: any) => inventoryApi.adjust(item!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); onClose(); setQty(''); setReason(''); },
  });

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Adjust Quantity</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              Current: <strong>{item.quantity} {item.unit.toLowerCase()}</strong>
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Quantity *</label>
            <input
              type="number"
              min={0}
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={String(item.quantity)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Used for cooking"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => adjustItem.mutate({ quantity: Number(qty), reason })}
            disabled={!qty || adjustItem.isPending}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {adjustItem.isPending ? 'Adjusting...' : 'Adjust Quantity'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Inventory Page ──────────────────────────────────────────────────────

export default function InventoryPage() {
  const { selectedFamilyId: familyId } = useFamily();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);

  // Fetch inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', familyId, categoryFilter, locationFilter],
    queryFn: () =>
      inventoryApi
        .list({
          familyId,
          ...(categoryFilter !== 'ALL' && { category: categoryFilter }),
          ...(locationFilter !== 'ALL' && { storageLocation: locationFilter }),
        })
        .then((r) => r.data.data as InventoryItem[]),
    enabled: !!familyId,
  });

  // Fetch shortages
  const { data: shortages } = useQuery({
    queryKey: ['inventory-shortages', familyId],
    queryFn: () => inventoryApi.getShortages(familyId!).then((r) => r.data.data as any[]),
    enabled: !!familyId,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory'] }),
  });

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!inventoryData) return [];
    const q = search.toLowerCase();
    return inventoryData.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.brand ?? '').toLowerCase().includes(q)
    );
  }, [inventoryData, search]);

  const handleOpenAdd = () => {
    setEditItem(null);
    setModalOpen(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditItem(item);
    setModalOpen(true);
  };

  if (!familyId) {
    return (
      <>
        <Header title="Inventory" description="Track your groceries" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <Package className="w-12 h-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Family Selected</h2>
          <p className="text-gray-500">Please create or join a family to manage inventory.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Inventory" description="Track and manage your grocery inventory" />

      <div className="p-6 max-w-7xl mx-auto space-y-5">

        {/* Shortages banner */}
        {shortages && shortages.length > 0 && (
          <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-800 font-medium flex-1">
              <strong>{shortages.length}</strong> shortage{shortages.length > 1 ? 's' : ''} detected in your inventory.
            </p>
            <Link
              href="/shopping"
              className="flex items-center gap-1 text-sm text-orange-700 font-semibold hover:text-orange-900 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Generate List
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Top controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search groceries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
            />
          </div>

          {/* Storage filter */}
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="ALL">All Locations</option>
            {STORAGE_LOCATIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
            ))}
          </select>

          {/* Add button */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Grocery
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
              categoryFilter === 'ALL'
                ? 'bg-green-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            All
          </button>
          {GROCERY_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                categoryFilter === cat.value
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <span>{cat.emoji}</span>
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {isLoading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">
              {search ? 'No items match your search' : 'No items in inventory'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {search
                ? 'Try a different search term or clear filters.'
                : 'Start by adding your first grocery item.'}
            </p>
            {!search && (
              <button
                onClick={handleOpenAdd}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Grocery
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <GroceryCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onDelete={(id) => deleteItem.mutate(id)}
                  onAdjust={(item) => setAdjustItem(item)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <GroceryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        editItem={editItem}
        familyId={familyId}
      />

      {/* Adjust Quantity Modal */}
      <AdjustModal
        open={!!adjustItem}
        item={adjustItem}
        onClose={() => setAdjustItem(null)}
      />
    </>
  );
}
