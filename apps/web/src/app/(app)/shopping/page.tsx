'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import * as Checkbox from '@radix-ui/react-checkbox';
import {
  Plus,
  Sparkles,
  Trash2,
  Check,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  CircleCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { shoppingApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { UNITS, GROCERY_CATEGORIES } from '@/lib/constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  category?: string;
  estimatedCost?: number;
  notes?: string;
}

interface ShoppingList {
  id: string;
  name: string;
  totalBudget?: number;
  totalCost?: number;
  isCompleted: boolean;
  items?: ShoppingItem[];
  createdAt: string;
}

interface AddItemForm {
  name: string;
  quantity: string;
  unit: string;
  category: string;
  estimatedCost: string;
}

// ─── Category helpers ─────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { emoji: string; label: string }> = {};
GROCERY_CATEGORIES.forEach((c) => {
  CATEGORY_META[c.value] = { emoji: c.emoji, label: c.label };
});

function getCategoryMeta(cat?: string) {
  if (!cat) return { emoji: '📦', label: 'Uncategorised' };
  return CATEGORY_META[cat] ?? { emoji: '📦', label: cat };
}

// ─── Animation variants ───────────────────────────────────────────────────────

const listCardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, type: 'spring', stiffness: 300, damping: 24 },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, height: 0, y: -8 },
  visible: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 22 },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -4,
    transition: { duration: 0.18 },
  },
};

const addFormVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: 'auto',
    transition: { type: 'spring', stiffness: 300, damping: 26 },
  },
  exit: { opacity: 0, height: 0, transition: { duration: 0.18 } },
};

// ─── Left panel: List card ────────────────────────────────────────────────────

interface ListCardProps {
  list: ShoppingList;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  deleting: boolean;
}

function ListCard({ list, index, isActive, onSelect, onDelete, deleting }: ListCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const items = list.items ?? [];
  const checkedCount = items.filter((i) => i.isChecked).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (confirmDelete) {
      onDelete();
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }

  return (
    <motion.div
      custom={index}
      variants={listCardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      onClick={onSelect}
      onMouseLeave={() => setConfirmDelete(false)}
      className={cn(
        'group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200',
        isActive
          ? 'border-emerald-300 bg-emerald-50 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md',
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="activeBar"
          className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-emerald-500"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('font-semibold truncate text-sm', isActive ? 'text-emerald-800' : 'text-gray-900')}>
              {list.name}
            </p>
            {list.isCompleted && <span className="badge-green text-xs">Done</span>}
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="badge-gray">
              {checkedCount}/{totalCount} items
            </span>
            {list.totalCost != null && (
              <span className="text-xs text-gray-500 font-medium">{formatCurrency(list.totalCost)}</span>
            )}
          </div>
        </div>

        {/* Delete button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={handleDelete}
          disabled={deleting}
          className={cn(
            'shrink-0 p-1.5 rounded-lg text-xs font-medium transition-all',
            confirmDelete
              ? 'bg-red-100 text-red-600 opacity-100'
              : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50',
          )}
          title={confirmDelete ? 'Click again to confirm' : 'Delete list'}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </motion.button>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-emerald-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Right panel: Item row ────────────────────────────────────────────────────

interface ItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  onDelete: () => void;
  toggling: boolean;
  deleting: boolean;
}

function ItemRow({ item, onToggle, onDelete, toggling, deleting }: ItemRowProps) {
  return (
    <motion.li
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors"
    >
      {/* Radix Checkbox */}
      <Checkbox.Root
        checked={item.isChecked}
        onCheckedChange={onToggle}
        disabled={toggling}
        className={cn(
          'w-5 h-5 shrink-0 rounded-md border-2 transition-all duration-150 flex items-center justify-center',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1',
          item.isChecked
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-gray-300 bg-white hover:border-emerald-400',
        )}
      >
        <AnimatePresence>
          {item.isChecked && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            >
              <Checkbox.Indicator>
                <Check className="w-3 h-3 text-white stroke-[3]" />
              </Checkbox.Indicator>
            </motion.span>
          )}
        </AnimatePresence>
      </Checkbox.Root>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <motion.p
          animate={{ opacity: item.isChecked ? 0.45 : 1 }}
          transition={{ duration: 0.2 }}
          className={cn('text-sm font-medium truncate', item.isChecked ? 'line-through text-gray-400' : 'text-gray-800')}
        >
          {item.name}
        </motion.p>
        {item.category && (
          <p className="text-xs text-gray-400 mt-0.5">{getCategoryMeta(item.category).emoji} {getCategoryMeta(item.category).label}</p>
        )}
      </div>

      <span className="text-xs text-gray-500 shrink-0 font-medium">{item.quantity} {item.unit.toLowerCase()}</span>
      {item.estimatedCost != null && (
        <span className="text-xs text-gray-500 shrink-0">{formatCurrency(item.estimatedCost)}</span>
      )}

      {/* Delete */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onDelete}
        disabled={deleting}
        className="shrink-0 p-1 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all"
      >
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
      </motion.button>
    </motion.li>
  );
}

// ─── Right panel: Category section ───────────────────────────────────────────

interface CategorySectionProps {
  category: string;
  items: ShoppingItem[];
  listId: string;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
  togglingId: string | null;
  deletingId: string | null;
}

function CategorySection({ category, items, listId, onToggle, onDelete, togglingId, deletingId }: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = getCategoryMeta(category === '__none__' ? undefined : category);

  return (
    <div className="mb-2">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
      >
        <span className="text-base">{meta.emoji}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex-1">{meta.label}</span>
        <span className="text-xs text-gray-400">{items.length}</span>
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={() => onToggle(item.id)}
                  onDelete={() => onDelete(item.id)}
                  toggling={togglingId === item.id}
                  deleting={deletingId === item.id}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ShoppingPage() {
  const { selectedFamilyId } = useFamily();
  const queryClient = useQueryClient();

  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [showNewInput, setShowNewInput] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddItemForm>({
    name: '',
    quantity: '1',
    unit: 'PIECES',
    category: '',
    estimatedCost: '',
  });
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);

  const newListInputRef = useRef<HTMLInputElement>(null);
  const addNameInputRef = useRef<HTMLInputElement>(null);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const { data: listsRaw, isLoading } = useQuery({
    queryKey: ['shopping-lists', selectedFamilyId],
    queryFn: () => shoppingApi.list(selectedFamilyId!).then((r) => r.data.data as ShoppingList[]),
    enabled: !!selectedFamilyId,
  });

  const lists: ShoppingList[] = listsRaw ?? [];
  const activeList = lists.find((l) => l.id === activeListId) ?? null;

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
  }, [queryClient]);

  const createListMutation = useMutation({
    mutationFn: (name: string) =>
      shoppingApi.create({ name, familyId: selectedFamilyId! }),
    onSuccess: (res) => {
      invalidate();
      const newId = res.data?.data?.id;
      if (newId) setActiveListId(newId);
      setNewListName('');
      setShowNewInput(false);
      toast.success('Shopping list created');
    },
    onError: () => toast.error('Failed to create list'),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id: string) => shoppingApi.delete(id),
    onSuccess: (_, id) => {
      invalidate();
      if (activeListId === id) setActiveListId(null);
      setDeletingListId(null);
      toast.success('List deleted');
    },
    onError: () => {
      setDeletingListId(null);
      toast.error('Failed to delete list');
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: () => shoppingApi.generate(selectedFamilyId!, 7),
    onSuccess: () => {
      invalidate();
      toast.success('Shopping list auto-generated from shortages!');
    },
    onError: () => toast.error('Auto-generate failed'),
  });

  const addItemMutation = useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: any }) =>
      shoppingApi.addItem(listId, data),
    onSuccess: () => {
      invalidate();
      setAddForm({ name: '', quantity: '1', unit: 'PIECES', category: '', estimatedCost: '' });
      addNameInputRef.current?.focus();
      toast.success('Item added');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ listId, itemId, data }: { listId: string; itemId: string; data: any }) =>
      shoppingApi.updateItem(listId, itemId, data),
    onSuccess: () => {
      invalidate();
      setTogglingId(null);
    },
    onError: () => {
      setTogglingId(null);
      toast.error('Failed to update item');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: ({ listId, itemId }: { listId: string; itemId: string }) =>
      shoppingApi.removeItem(listId, itemId),
    onSuccess: () => {
      invalidate();
      setDeletingItemId(null);
      toast.success('Item removed');
    },
    onError: () => {
      setDeletingItemId(null);
      toast.error('Failed to remove item');
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleCreateList() {
    const name = newListName.trim();
    if (!name || !selectedFamilyId) return;
    createListMutation.mutate(name);
  }

  function handleAddItem() {
    if (!addForm.name.trim() || !activeListId) return;
    addItemMutation.mutate({
      listId: activeListId,
      data: {
        name: addForm.name.trim(),
        quantity: parseFloat(addForm.quantity) || 1,
        unit: addForm.unit || 'PIECES',
        category: addForm.category || undefined,
        estimatedCost: addForm.estimatedCost ? parseFloat(addForm.estimatedCost) : undefined,
      },
    });
  }

  function handleToggleItem(listId: string, itemId: string, currentValue: boolean) {
    setTogglingId(itemId);
    updateItemMutation.mutate({ listId, itemId, data: { isChecked: !currentValue } });
  }

  function handleDeleteItem(listId: string, itemId: string) {
    setDeletingItemId(itemId);
    removeItemMutation.mutate({ listId, itemId });
  }

  function handleMarkAllComplete() {
    if (!activeList?.items?.length) return;
    const unchecked = (activeList.items ?? []).filter((i) => !i.isChecked);
    unchecked.forEach((item) => {
      updateItemMutation.mutate({
        listId: activeList.id,
        itemId: item.id,
        data: { isChecked: true },
      });
    });
    toast.success('All items marked as complete');
  }

  function handleClearChecked() {
    if (!activeList?.items?.length) return;
    const checked = (activeList.items ?? []).filter((i) => i.isChecked);
    checked.forEach((item) => {
      removeItemMutation.mutate({ listId: activeList.id, itemId: item.id });
    });
    toast.success(`Cleared ${checked.length} checked item${checked.length === 1 ? '' : 's'}`);
  }

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const activeItems = activeList?.items ?? [];
  const checkedCount = activeItems.filter((i) => i.isChecked).length;
  const totalCount = activeItems.length;

  // Group items by category
  const groupedItems = activeItems.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = item.category || '__none__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const categoryKeys = Object.keys(groupedItems).sort((a, b) => {
    if (a === '__none__') return 1;
    if (b === '__none__') return -1;
    return a.localeCompare(b);
  });

  // ─── No family guard ──────────────────────────────────────────────────────

  if (!selectedFamilyId) {
    return (
      <div>
        <Header title="Shopping Lists" description="Manage your grocery shopping" />
        <div className="flex flex-col items-center justify-center py-24 text-center px-4">
          <ShoppingCart className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-lg font-semibold text-gray-500">Select a family to view shopping lists</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <Header title="Shopping Lists" description="Organise and track your grocery trips" />

      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* ── Left Panel ────────────────────────────────────────────── */}
        <aside className="w-80 shrink-0 border-r border-gray-100 bg-gray-50/60 flex flex-col overflow-hidden">
          {/* Actions */}
          <div className="p-4 space-y-2 border-b border-gray-100">
            <AnimatePresence mode="wait">
              {showNewInput ? (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex gap-2"
                >
                  <input
                    ref={newListInputRef}
                    autoFocus
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateList();
                      if (e.key === 'Escape') { setShowNewInput(false); setNewListName(''); }
                    }}
                    placeholder="List name..."
                    className="input flex-1 py-2 text-sm"
                  />
                  <button
                    onClick={handleCreateList}
                    disabled={!newListName.trim() || createListMutation.isPending}
                    className="btn-primary btn-sm px-3"
                  >
                    {createListMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setShowNewInput(false); setNewListName(''); }}
                    className="btn-ghost btn-sm px-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="new-btn"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => { setShowNewInput(true); setTimeout(() => newListInputRef.current?.focus(), 50); }}
                  className="btn-primary btn-md w-full"
                >
                  <Plus className="w-4 h-4" />
                  New List
                </motion.button>
              )}
            </AnimatePresence>

            <button
              onClick={() => autoGenerateMutation.mutate()}
              disabled={autoGenerateMutation.isPending}
              className="btn-outline btn-md w-full"
            >
              {autoGenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-violet-500" />
              )}
              {autoGenerateMutation.isPending ? 'Generating...' : 'Auto-Generate'}
            </button>
          </div>

          {/* List cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-20 w-full" />
              ))
            ) : lists.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 font-medium">No lists yet</p>
                <p className="text-xs text-gray-300 mt-1">Create one above or auto-generate</p>
              </div>
            ) : (
              <LayoutGroup>
                <AnimatePresence initial={false}>
                  {lists.map((list, i) => (
                    <ListCard
                      key={list.id}
                      list={list}
                      index={i}
                      isActive={activeListId === list.id}
                      onSelect={() => setActiveListId(list.id)}
                      onDelete={() => {
                        setDeletingListId(list.id);
                        deleteListMutation.mutate(list.id);
                      }}
                      deleting={deletingListId === list.id}
                    />
                  ))}
                </AnimatePresence>
              </LayoutGroup>
            )}
          </div>
        </aside>

        {/* ── Right Panel ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-white flex flex-col">
          <AnimatePresence mode="wait">
            {!activeList ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-24 px-6"
              >
                <div className="w-20 h-20 rounded-3xl bg-emerald-50 flex items-center justify-center mb-6">
                  <ShoppingCart className="w-10 h-10 text-emerald-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Select a list</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Choose a shopping list from the left panel to view and manage its items.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeList.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                className="flex flex-col h-full"
              >
                {/* Right panel header */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{activeList.name}</h2>
                      <p className="text-sm text-gray-400 mt-0.5">
                        {checkedCount} of {totalCount} items checked
                        {activeList.totalCost != null && (
                          <span className="ml-2 text-emerald-600 font-semibold">
                            · {formatCurrency(activeList.totalCost)}
                          </span>
                        )}
                        {activeList.totalBudget != null && (
                          <span className="ml-1 text-gray-400">
                            / {formatCurrency(activeList.totalBudget)} budget
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {totalCount > 0 && checkedCount < totalCount && (
                        <button
                          onClick={handleMarkAllComplete}
                          className="btn-outline btn-sm"
                        >
                          <CircleCheck className="w-4 h-4 text-emerald-500" />
                          Mark all done
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Global progress bar */}
                  {totalCount > 0 && (
                    <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${(checkedCount / totalCount) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                      />
                    </div>
                  )}
                </div>

                {/* Items area */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {totalCount === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-16 text-center"
                    >
                      <p className="text-sm text-gray-400 font-medium">No items yet</p>
                      <p className="text-xs text-gray-300 mt-1">Add items using the form below</p>
                    </motion.div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {categoryKeys.map((cat) => (
                        <CategorySection
                          key={cat}
                          category={cat}
                          items={groupedItems[cat]}
                          listId={activeList.id}
                          onToggle={(itemId) => {
                            const item = activeItems.find((i) => i.id === itemId);
                            if (item) handleToggleItem(activeList.id, itemId, item.isChecked);
                          }}
                          onDelete={(itemId) => handleDeleteItem(activeList.id, itemId)}
                          togglingId={togglingId}
                          deletingId={deletingItemId}
                        />
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Footer: Add item + summary */}
                {!activeList.isCompleted && (
                  <div className="border-t border-gray-100 bg-gray-50/60">
                    {/* Add item toggle */}
                    <div className="px-5 pt-3 pb-1">
                      <button
                        onClick={() => {
                          setShowAddForm((v) => !v);
                          if (!showAddForm) setTimeout(() => addNameInputRef.current?.focus(), 60);
                        }}
                        className="btn-ghost btn-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add item
                      </button>
                    </div>

                    {/* Add item form */}
                    <AnimatePresence>
                      {showAddForm && (
                        <motion.div
                          variants={addFormVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-4 pt-2 space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                ref={addNameInputRef}
                                type="text"
                                placeholder="Item name"
                                value={addForm.name}
                                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="input col-span-2 py-2 text-sm"
                              />
                              <input
                                type="number"
                                placeholder="Qty"
                                value={addForm.quantity}
                                onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="input py-2 text-sm"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={addForm.unit}
                                onChange={(e) => setAddForm((f) => ({ ...f, unit: e.target.value }))}
                                className="select py-2 text-sm"
                              >
                                {UNITS.map((u) => (
                                  <option key={u.value} value={u.value}>{u.value}</option>
                                ))}
                              </select>
                              <select
                                value={addForm.category}
                                onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                                className="select py-2 text-sm"
                              >
                                <option value="">Category</option>
                                {GROCERY_CATEGORIES.map((c) => (
                                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                placeholder="Cost (₹)"
                                value={addForm.estimatedCost}
                                onChange={(e) => setAddForm((f) => ({ ...f, estimatedCost: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="input py-2 text-sm"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={handleAddItem}
                                disabled={!addForm.name.trim() || addItemMutation.isPending}
                                className="btn-primary btn-sm flex-1"
                              >
                                {addItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
                              </button>
                              <button
                                onClick={() => setShowAddForm(false)}
                                className="btn-ghost btn-sm px-3"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Summary footer */}
                    {totalCount > 0 && (
                      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
                        <span className="font-medium">{checkedCount} / {totalCount} checked</span>
                        <div className="flex items-center gap-3">
                          {activeList.totalCost != null && (
                            <span className="text-emerald-600 font-semibold">{formatCurrency(activeList.totalCost)}</span>
                          )}
                          {checkedCount > 0 && (
                            <button
                              onClick={handleClearChecked}
                              className="text-red-400 hover:text-red-600 font-medium transition-colors"
                            >
                              Clear checked
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
