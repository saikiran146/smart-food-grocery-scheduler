'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  Package,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
  ShoppingBasket,
  Check,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useFamily } from '@/hooks/useFamily';
import { inventoryApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils/cn';
import {
  formatCurrency,
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

type ViewMode = 'cards' | 'pantry' | 'list';
type SortField = 'name' | 'quantity' | 'expiry';
type SortDir = 'asc' | 'desc';

// ─── Category colour map ──────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; strip: string; text: string; light: string }> = {
  VEGETABLES: { bg: 'bg-emerald-50', strip: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-100' },
  DAIRY:      { bg: 'bg-blue-50',    strip: 'bg-blue-500',    text: 'text-blue-700',    light: 'bg-blue-100' },
  MEAT:       { bg: 'bg-red-50',     strip: 'bg-red-500',     text: 'text-red-700',     light: 'bg-red-100' },
  SPICES:     { bg: 'bg-orange-50',  strip: 'bg-orange-500',  text: 'text-orange-700',  light: 'bg-orange-100' },
  RICE:       { bg: 'bg-yellow-50',  strip: 'bg-yellow-500',  text: 'text-yellow-700',  light: 'bg-yellow-100' },
  PULSES:     { bg: 'bg-amber-50',   strip: 'bg-amber-500',   text: 'text-amber-700',   light: 'bg-amber-100' },
  FRUITS:     { bg: 'bg-pink-50',    strip: 'bg-pink-500',    text: 'text-pink-700',    light: 'bg-pink-100' },
  OILS:       { bg: 'bg-violet-50',  strip: 'bg-violet-500',  text: 'text-violet-700',  light: 'bg-violet-100' },
  SNACKS:     { bg: 'bg-gray-50',    strip: 'bg-gray-400',    text: 'text-gray-700',    light: 'bg-gray-100' },
  BEVERAGES:  { bg: 'bg-sky-50',     strip: 'bg-sky-500',     text: 'text-sky-700',     light: 'bg-sky-100' },
  OTHER:      { bg: 'bg-gray-50',    strip: 'bg-gray-400',    text: 'text-gray-700',    light: 'bg-gray-100' },
};

const getCategoryMeta = (value: string) =>
  GROCERY_CATEGORIES.find((c) => c.value === value) ?? { emoji: '📦', label: value, color: 'gray' };

const getCategoryColors = (value: string) =>
  CATEGORY_COLORS[value] ?? CATEGORY_COLORS.OTHER;

const getStorageMeta = (value?: string) =>
  STORAGE_LOCATIONS.find((s) => s.value === value) ?? { emoji: '📦', label: value ?? 'Unknown' };

// ─── Expiry helpers ───────────────────────────────────────────────────────────

function getExpiryBar(expiryDate?: string): { pct: number; color: string; label: string } {
  if (!expiryDate) return { pct: 0, color: 'bg-gray-200', label: '' };
  const days = getDaysUntilExpiry(expiryDate);
  if (isExpired(expiryDate)) return { pct: 100, color: 'bg-red-500', label: 'Expired' };
  if (days <= 3) return { pct: Math.min(100, ((7 - days) / 7) * 100), color: 'bg-red-400', label: `${days}d left` };
  if (days <= 7) return { pct: Math.min(100, ((14 - days) / 14) * 100), color: 'bg-orange-400', label: `${days}d left` };
  return { pct: 20, color: 'bg-emerald-400', label: `${days}d left` };
}

function ExpiryBadge({ expiryDate }: { expiryDate?: string }) {
  if (!expiryDate) return null;
  const days = getDaysUntilExpiry(expiryDate);
  const expired = isExpired(expiryDate);
  if (expired) return <span className="badge badge-red">Expired</span>;
  if (days <= 3) return <span className="badge badge-red">{days}d left</span>;
  if (days <= 7) return <span className="badge badge-orange">{days}d left</span>;
  return <span className="badge badge-green">{days}d left</span>;
}

// ─── Motion variants ──────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] } }),
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.03, duration: 0.25, ease: 'easeOut' } }),
  exit: { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

const drawerVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card overflow-hidden animate-shimmer">
          <div className="h-2 bg-gray-200 w-full" />
          <div className="p-4 space-y-3">
            <div className="flex gap-3 items-center">
              <div className="w-12 h-12 skeleton rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
              </div>
            </div>
            <div className="skeleton h-2 rounded-full w-full" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar({ items }: { items: InventoryItem[] }) {
  const total = items.length;
  const expiring3 = items.filter((i) => i.expiryDate && isExpiringSoon(i.expiryDate, 3) && !isExpired(i.expiryDate)).length;
  const totalValue = items.reduce((sum, i) => sum + (i.costPerUnit ?? 0) * i.quantity, 0);
  const lowStock = items.filter((i) => i.quantity <= 1).length;

  const stats = [
    { label: 'Total Items', value: total, icon: '📦', color: 'text-blue-600' },
    { label: 'Expiring Soon', value: expiring3, icon: '⏰', color: expiring3 > 0 ? 'text-red-600' : 'text-gray-400' },
    { label: 'Total Value', value: formatCurrency(totalValue), icon: '💰', color: 'text-emerald-600' },
    { label: 'Low Stock', value: lowStock, icon: '⚠️', color: lowStock > 0 ? 'text-orange-600' : 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-3.5 flex items-center gap-3">
          <span className="text-2xl">{s.icon}</span>
          <div>
            <p className={cn('text-lg font-bold leading-none', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card View ────────────────────────────────────────────────────────────────

function InventoryCard({
  item,
  index,
  onEdit,
  onDelete,
}: {
  item: InventoryItem;
  index: number;
  onEdit: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cat = getCategoryMeta(item.category);
  const colors = getCategoryColors(item.category);
  const { pct, color, label } = getExpiryBar(item.expiryDate);
  const expired = item.expiryDate ? isExpired(item.expiryDate) : false;
  const expiring = item.expiryDate ? isExpiringSoon(item.expiryDate, 3) : false;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(0,0,0,0.12)' }}
      className={cn(
        'card overflow-hidden group relative flex flex-col',
        expired && 'ring-1 ring-red-300',
        expiring && !expired && 'ring-1 ring-orange-300'
      )}
    >
      {/* Category colour strip */}
      <div className={cn('h-1.5 w-full', colors.strip)} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0', colors.light)}>
            {cat.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate leading-tight">{item.name}</p>
            <p className={cn('text-xs font-medium mt-0.5', colors.text)}>{cat.label}</p>
          </div>
        </div>

        {/* Quantity badge */}
        <div className="flex items-center justify-between">
          <span className={cn('badge', colors.light, colors.text)}>
            {item.quantity} {item.unit.toLowerCase()}
          </span>
          <ExpiryBadge expiryDate={item.expiryDate} />
        </div>

        {/* Expiry progress bar */}
        {item.expiryDate && (
          <div>
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Freshness</span>
              <span>{label}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', color)}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Storage */}
        {item.storageLocation && (
          <p className="text-[11px] text-gray-400">
            {getStorageMeta(item.storageLocation).emoji} {getStorageMeta(item.storageLocation).label}
            {item.costPerUnit != null && (
              <span className="ml-2">· {formatCurrency(item.costPerUnit)}/unit</span>
            )}
          </p>
        )}

        {/* Hover actions */}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mt-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 w-full">
              <span className="text-xs text-red-600 font-medium flex-1">Delete?</span>
              <button
                onClick={() => onDelete(item.id)}
                className="btn btn-danger btn-sm px-2 py-1"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-outline btn-sm px-2 py-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onEdit(item)}
                className="btn btn-outline btn-sm flex-1"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-sm border border-red-100 text-red-500 hover:bg-red-50 px-2 py-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pantry View ──────────────────────────────────────────────────────────────

const SHELVES: { key: string; label: string; emoji: string; locations: string[] }[] = [
  { key: 'fridge',  label: 'Fridge',  emoji: '🧊', locations: ['REFRIGERATOR'] },
  { key: 'pantry',  label: 'Pantry',  emoji: '🏠', locations: ['PANTRY'] },
  { key: 'freezer', label: 'Freezer', emoji: '❄️', locations: ['FREEZER'] },
];

function PantryView({ items, onEdit, onDelete }: { items: InventoryItem[]; onEdit: (i: InventoryItem) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {SHELVES.map((shelf) => {
        const shelfItems = items.filter((i) =>
          shelf.locations.includes(i.storageLocation ?? '')
        );
        return (
          <div key={shelf.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{shelf.emoji}</span>
              <h3 className="section-title">{shelf.label}</h3>
              <span className="badge badge-gray ml-1">{shelfItems.length}</span>
            </div>
            {shelfItems.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center text-gray-400 text-sm">
                Empty {shelf.label.toLowerCase()}
              </div>
            ) : (
              <motion.div layout className="flex flex-wrap gap-3">
                <AnimatePresence>
                  {shelfItems.map((item) => {
                    const cat = getCategoryMeta(item.category);
                    const colors = getCategoryColors(item.category);
                    const expired = item.expiryDate ? isExpired(item.expiryDate) : false;
                    const expiring = item.expiryDate ? isExpiringSoon(item.expiryDate, 3) : false;
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className={cn(
                          'group relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all',
                          colors.bg,
                          expired && 'ring-2 ring-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]',
                          expiring && !expired && 'ring-2 ring-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.25)]',
                          !expired && !expiring && 'ring-1 ring-white hover:ring-2 hover:ring-gray-200 hover:-translate-y-1'
                        )}
                        onClick={() => onEdit(item)}
                        title={item.name}
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <p className="text-[10px] font-semibold text-center text-gray-700 leading-tight px-1 line-clamp-2">{item.name}</p>
                        <p className={cn('text-[10px] font-bold', colors.text)}>{item.quantity}{item.unit.toLowerCase().slice(0, 2)}</p>
                        {/* quick delete */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        );
      })}
      {/* Uncategorized storage */}
      {(() => {
        const rest = items.filter(
          (i) => !i.storageLocation || !SHELVES.flatMap((s) => s.locations).includes(i.storageLocation)
        );
        if (!rest.length) return null;
        return (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📦</span>
              <h3 className="section-title">Other</h3>
              <span className="badge badge-gray ml-1">{rest.length}</span>
            </div>
            <motion.div layout className="flex flex-wrap gap-3">
              {rest.map((item) => {
                const cat = getCategoryMeta(item.category);
                const colors = getCategoryColors(item.category);
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className={cn('group relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer', colors.bg, 'ring-1 ring-white hover:ring-2 hover:ring-gray-200')}
                    onClick={() => onEdit(item)}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <p className="text-[10px] font-semibold text-center text-gray-700 px-1 line-clamp-2">{item.name}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  items,
  onEdit,
  onDelete,
}: {
  items: InventoryItem[];
  onEdit: (i: InventoryItem) => void;
  onDelete: (id: string) => void;
}) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      let va: string | number = '';
      let vb: string | number = '';
      if (sortField === 'name') { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (sortField === 'quantity') { va = a.quantity; vb = b.quantity; }
      else if (sortField === 'expiry') {
        va = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
        vb = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [items, sortField, sortDir]);

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(f); setSortDir('asc'); }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <span className="ml-1 inline-flex">
      {sortField === field ? (
        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronUp className="w-3 h-3 opacity-30" />
      )}
    </span>
  );

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-8 px-4 py-3" />
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 select-none"
                onClick={() => toggleSort('name')}
              >
                Item <SortIcon field="name" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 select-none"
                onClick={() => toggleSort('quantity')}
              >
                Qty <SortIcon field="quantity" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-900 select-none"
                onClick={() => toggleSort('expiry')}
              >
                Expiry <SortIcon field="expiry" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Location</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {sorted.map((item, i) => {
                const cat = getCategoryMeta(item.category);
                const colors = getCategoryColors(item.category);
                const isConfirm = deleteConfirm === item.id;
                return (
                  <motion.tr
                    key={item.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className="border-b border-gray-50 hover:bg-gray-50/60 group transition-colors"
                  >
                    <td className="px-4 py-3 text-center">
                      <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-sm mx-auto', colors.light)}>
                        {cat.emoji}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      {item.brand && <p className="text-xs text-gray-400">{item.brand}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('badge', colors.light, colors.text)}>
                        {item.quantity} {item.unit.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ExpiryBadge expiryDate={item.expiryDate} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.storageLocation ? getStorageMeta(item.storageLocation).emoji + ' ' + getStorageMeta(item.storageLocation).label : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isConfirm ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => { onDelete(item.id); setDeleteConfirm(null); }} className="btn btn-danger btn-sm px-1.5 py-1">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} className="btn btn-outline btn-sm px-1.5 py-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => onEdit(item)} className="btn btn-ghost btn-sm px-1.5 py-1">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteConfirm(item.id)} className="btn btn-ghost btn-sm px-1.5 py-1 text-red-400 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Add/Edit Drawer ──────────────────────────────────────────────────────────

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

function InventoryDrawer({
  open,
  onClose,
  editItem,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  editItem?: InventoryItem | null;
  familyId: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!editItem;
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const set = (field: string, value: unknown) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const createItem = useMutation({
    mutationFn: (data: unknown) => inventoryApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item added to inventory');
      onClose();
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateItem = useMutation({
    mutationFn: (data: unknown) => inventoryApi.update(editItem!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item updated');
      onClose();
    },
    onError: () => toast.error('Failed to update item'),
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.quantity || Number(form.quantity) <= 0) e.quantity = 'Enter a valid quantity';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Item' : 'Add to Inventory'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{isEdit ? 'Update item details' : 'Fill in the details below'}</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-sm p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Item Name <span className="text-red-400">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Tomatoes"
                  className={cn('input', errors.name && 'border-red-400 focus:border-red-400')}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category <span className="text-red-400">*</span></label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)} className="select">
                  {GROCERY_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    className={cn('input', errors.quantity && 'border-red-400')}
                  />
                  {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit <span className="text-red-400">*</span></label>
                  <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className="select">
                    {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Purchase + Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Purchase Date</label>
                  <input type="date" value={form.purchaseDate} onChange={(e) => set('purchaseDate', e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expiry Date</label>
                  <input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} className="input" />
                </div>
              </div>

              {/* Cost + Storage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cost per Unit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.costPerUnit}
                    onChange={(e) => set('costPerUnit', e.target.value)}
                    placeholder="0.00"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Storage <span className="text-red-400">*</span></label>
                  <select value={form.storageLocation} onChange={(e) => set('storageLocation', e.target.value)} className="select">
                    {STORAGE_LOCATIONS.map((s) => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Brand */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Brand</label>
                <input
                  value={form.brand}
                  onChange={(e) => set('brand', e.target.value)}
                  placeholder="e.g. Amul, Tata"
                  className="input"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes..."
                  className="input resize-none"
                />
              </div>
            </form>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={onClose} className="btn btn-outline btn-md flex-1">Cancel</button>
              <button
                onClick={(e) => { e.preventDefault(); handleSubmit(e as unknown as React.FormEvent); }}
                disabled={isPending}
                className="btn btn-primary btn-md flex-1"
              >
                {isPending ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const VIEW_TABS: { id: ViewMode; label: string; Icon: React.FC<{ className?: string }> }[] = [
  { id: 'cards', label: 'Cards',  Icon: LayoutGrid },
  { id: 'pantry', label: 'Pantry', Icon: ShoppingBasket },
  { id: 'list',  label: 'List',   Icon: List },
];

const FILTER_PILLS = [
  { id: 'ALL',           label: 'All' },
  { id: 'EXPIRING_SOON', label: '⏰ Expiring' },
  { id: 'LOW_STOCK',     label: '⚠️ Low Stock' },
  { id: 'VEGETABLES',    label: '🥦 Vegetables' },
  { id: 'DAIRY',         label: '🥛 Dairy' },
  { id: 'MEAT',          label: '🍗 Meat' },
];

export default function InventoryPage() {
  const { selectedFamilyId: familyId } = useFamily();
  const qc = useQueryClient();

  const [view, setView] = useState<ViewMode>('cards');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory', familyId],
    queryFn: () =>
      inventoryApi.list({ familyId }).then((r) => r.data.data as InventoryItem[]),
    enabled: !!familyId,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => inventoryApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item removed from inventory');
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const allItems: InventoryItem[] = inventoryData ?? [];

  const filtered = useMemo(() => {
    let list = allItems;
    const q = search.toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || (i.brand ?? '').toLowerCase().includes(q));
    if (filter === 'EXPIRING_SOON') list = list.filter((i) => i.expiryDate && isExpiringSoon(i.expiryDate, 7) && !isExpired(i.expiryDate));
    else if (filter === 'LOW_STOCK') list = list.filter((i) => i.quantity <= 1);
    else if (filter !== 'ALL') list = list.filter((i) => i.category === filter);
    return list;
  }, [allItems, search, filter]);

  const openAdd = () => { setEditItem(null); setDrawerOpen(true); };
  const openEdit = (item: InventoryItem) => { setEditItem(item); setDrawerOpen(true); };

  if (!familyId) {
    return (
      <>
        <Header title="Inventory" description="Track your groceries" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center text-4xl mb-4">📦</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Family Selected</h2>
          <p className="text-gray-500 text-sm">Please create or join a family to manage inventory.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Inventory" description="Track and manage your grocery inventory" />

      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">

        {/* Stats bar */}
        {!isLoading && allItems.length > 0 && <StatsBar items={allItems} />}

        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              className="input pl-9 pr-3 py-2.5"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View switcher */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
            {VIEW_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                  view === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Add button */}
          <button onClick={openAdd} className="btn btn-primary btn-md">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilter(pill.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all',
                filter === pill.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              )}
            >
              {pill.label}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-1 shrink-0">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Content */}
        {isLoading ? (
          <SkeletonGrid />
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-gray-100 flex items-center justify-center text-5xl mb-5">
              {search ? '🔍' : '📦'}
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {search ? 'No results found' : 'Your inventory is empty'}
            </h3>
            <p className="text-sm text-gray-500 mb-5 max-w-xs">
              {search
                ? 'Try a different search term or clear your filters.'
                : 'Start adding grocery items to keep track of what you have at home.'}
            </p>
            {!search && (
              <button onClick={openAdd} className="btn btn-primary btn-md">
                <Plus className="w-4 h-4" /> Add First Item
              </button>
            )}
          </motion.div>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((item, i) => (
                <InventoryCard
                  key={item.id}
                  item={item}
                  index={i}
                  onEdit={openEdit}
                  onDelete={(id) => deleteItem.mutate(id)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : view === 'pantry' ? (
          <PantryView
            items={filtered}
            onEdit={openEdit}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        ) : (
          <ListView
            items={filtered}
            onEdit={openEdit}
            onDelete={(id) => deleteItem.mutate(id)}
          />
        )}
      </div>

      {/* Drawer */}
      <InventoryDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditItem(null); }}
        editItem={editItem}
        familyId={familyId}
      />
    </>
  );
}
