'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, X, Edit2, Trash2, Check, Leaf } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { fruitsApi } from '@/lib/api/endpoints';
import { useFamily } from '@/hooks/useFamily';
import { formatDate, getDaysUntilExpiry } from '@/lib/utils/format';
import { RIPENESS_LEVELS, UNITS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FruitItem {
  id: string;
  name: string;
  quantity: number;
  originalQuantity: number;
  unit?: string;
  purchaseDate: string;
  ripenessLevel: string;
  expectedRipeDays?: number;
  costPerPiece?: number;
  expectedRipeDate?: string;
  notes?: string;
}

// ─── Fruit emoji helper ───────────────────────────────────────────────────────

const FRUIT_EMOJIS: Record<string, string> = {
  banana: '🍌',
  apple: '🍎',
  orange: '🍊',
  lemon: '🍋',
  mango: '🥭',
  grape: '🍇',
  grapes: '🍇',
  strawberry: '🍓',
  watermelon: '🍉',
  pineapple: '🍍',
  papaya: '🍈',
  peach: '🍑',
  cherry: '🍒',
  kiwi: '🥝',
  avocado: '🥑',
  coconut: '🥥',
  guava: '🍐',
  fig: '🍑',
  pomegranate: '🍎',
};

function getFruitEmoji(name: string): string {
  const low = name.toLowerCase();
  return Object.entries(FRUIT_EMOJIS).find(([k]) => low.includes(k))?.[1] ?? '🍑';
}

// ─── Ripeness config ──────────────────────────────────────────────────────────

interface RipenessConfig {
  ringPct: number;
  ringColor: string;
  ringTrack: string;
  badgeClass: string;
  label: string;
}

const RIPENESS_CONFIG: Record<string, RipenessConfig> = {
  UNRIPE:        { ringPct: 85, ringColor: '#3b82f6', ringTrack: '#dbeafe', badgeClass: 'badge-blue',   label: 'Unripe' },
  SLIGHTLY_RIPE: { ringPct: 65, ringColor: '#22c55e', ringTrack: '#dcfce7', badgeClass: 'badge-green',  label: 'Slightly Ripe' },
  RIPE:          { ringPct: 70, ringColor: '#10b981', ringTrack: '#d1fae5', badgeClass: 'badge-green',  label: 'Ripe' },
  OVERRIPE:      { ringPct: 30, ringColor: '#f97316', ringTrack: '#ffedd5', badgeClass: 'badge-orange', label: 'Overripe' },
  EXPIRED:       { ringPct: 0,  ringColor: '#ef4444', ringTrack: '#fee2e2', badgeClass: 'badge-red',    label: 'Expired' },
};

function getRipenessConfig(level: string): RipenessConfig {
  return RIPENESS_CONFIG[level] ?? RIPENESS_CONFIG.RIPE;
}

// ─── SVG Freshness Ring ───────────────────────────────────────────────────────

const RING_R = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R;

function FreshnessRing({ level, emoji }: { level: string; emoji: string }) {
  const cfg = getRipenessConfig(level);
  const dashOffset = useMotionValue(RING_CIRCUMFERENCE);

  useEffect(() => {
    const target = RING_CIRCUMFERENCE * (1 - cfg.ringPct / 100);
    const controls = animate(dashOffset, target, { duration: 0.9, ease: [0.16, 1, 0.3, 1] });
    return controls.stop;
  }, [level, cfg.ringPct, dashOffset]);

  const isExpiredLevel = level === 'EXPIRED';

  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      {isExpiredLevel ? (
        <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center text-4xl opacity-50">
          {emoji}
        </div>
      ) : (
        <>
          <svg width="96" height="96" className="absolute inset-0 -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={RING_R}
              fill="none"
              stroke={cfg.ringTrack}
              strokeWidth="6"
            />
            <motion.circle
              cx="48"
              cy="48"
              r={RING_R}
              fill="none"
              stroke={cfg.ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <span className="text-4xl relative z-10">{emoji}</span>
        </>
      )}
    </div>
  );
}

// ─── Fruit Card ───────────────────────────────────────────────────────────────

function FruitCard({
  fruit,
  index,
  onEdit,
  onDelete,
  onConsume,
}: {
  fruit: FruitItem;
  index: number;
  onEdit: (f: FruitItem) => void;
  onDelete: (id: string) => void;
  onConsume: (f: FruitItem) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const emoji = getFruitEmoji(fruit.name);
  const cfg = getRipenessConfig(fruit.ripenessLevel);
  const daysLeft = fruit.expectedRipeDate ? getDaysUntilExpiry(fruit.expectedRipeDate) : null;
  const isUrgent = fruit.ripenessLevel === 'OVERRIPE' || fruit.ripenessLevel === 'EXPIRED';

  return (
    <motion.div
      custom={index}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { delay: index * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
      }}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      whileHover={{ y: -4, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }}
      className={cn(
        'card flex flex-col items-center text-center p-5 gap-3 group relative overflow-hidden',
        isUrgent && 'ring-2 ring-orange-300 bg-orange-50/30'
      )}
    >
      {/* Urgency accent */}
      {isUrgent && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-red-400" />
      )}

      {/* Freshness ring */}
      <FreshnessRing level={fruit.ripenessLevel} emoji={emoji} />

      {/* Name */}
      <div>
        <h3 className="font-bold text-gray-900 text-base leading-tight">{fruit.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5">
          {fruit.quantity} {fruit.unit?.toLowerCase() ?? 'pcs'}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className={cn('badge', cfg.badgeClass)}>{cfg.label}</span>
        {daysLeft !== null && (
          <span className={cn('badge', daysLeft <= 0 ? 'badge-red' : daysLeft <= 2 ? 'badge-orange' : daysLeft <= 5 ? 'badge-amber' : 'badge-green')}>
            {daysLeft <= 0 ? 'Expired' : `${daysLeft}d left`}
          </span>
        )}
      </div>

      {/* Purchase date */}
      {fruit.purchaseDate && (
        <p className="text-[11px] text-gray-400">Bought {formatDate(fruit.purchaseDate)}</p>
      )}

      {/* Actions */}
      <div className="w-full flex flex-col gap-2 mt-auto">
        {isUrgent && (
          <button
            onClick={() => onConsume(fruit)}
            className="btn btn-sm w-full bg-orange-500 text-white hover:bg-orange-600 active:scale-95"
          >
            Use Today!
          </button>
        )}
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <>
              <span className="text-xs text-red-600 font-medium flex-1 text-left">Delete?</span>
              <button onClick={() => { onDelete(fruit.id); setConfirmDelete(false); }} className="btn btn-danger btn-sm px-2 py-1">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn btn-outline btn-sm px-2 py-1">
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => onEdit(fruit)} className="btn btn-outline btn-sm flex-1">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button onClick={() => setConfirmDelete(true)} className="btn btn-sm border border-red-100 text-red-500 hover:bg-red-50 px-2 py-1.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary Bar ──────────────────────────────────────────────────────────────

function SummaryBar({ fruits }: { fruits: FruitItem[] }) {
  const total = fruits.length;
  const fresh = fruits.filter((f) => f.ripenessLevel === 'RIPE' || f.ripenessLevel === 'UNRIPE' || f.ripenessLevel === 'SLIGHTLY_RIPE').length;
  const useSoon = fruits.filter((f) => f.ripenessLevel === 'OVERRIPE').length;
  const expired = fruits.filter((f) => f.ripenessLevel === 'EXPIRED').length;

  const stats = [
    { label: 'Total Fruits', value: total, emoji: '🍱', color: 'text-blue-600' },
    { label: 'Fresh',        value: fresh, emoji: '✅', color: 'text-emerald-600' },
    { label: 'Use Soon',     value: useSoon, emoji: '⚡', color: useSoon > 0 ? 'text-orange-600' : 'text-gray-400' },
    { label: 'Expired',      value: expired, emoji: '❌', color: expired > 0 ? 'text-red-600' : 'text-gray-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="card p-3.5 flex items-center gap-3">
          <span className="text-2xl">{s.emoji}</span>
          <div>
            <p className={cn('text-xl font-bold leading-none', s.color)}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function FruitSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card p-5 flex flex-col items-center gap-3 animate-shimmer">
          <div className="skeleton w-24 h-24 rounded-full" />
          <div className="skeleton h-4 w-24 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
          <div className="flex gap-2">
            <div className="skeleton h-6 w-16 rounded-full" />
            <div className="skeleton h-6 w-14 rounded-full" />
          </div>
          <div className="skeleton h-8 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

// ─── Add / Edit Drawer ────────────────────────────────────────────────────────

const EMPTY_FRUIT_FORM = {
  name: '',
  quantity: '',
  unit: 'PIECES',
  purchaseDate: new Date().toISOString().split('T')[0],
  expectedRipeDate: '',
  ripenessLevel: 'UNRIPE',
  expectedRipeDays: '5',
  notes: '',
  costPerPiece: '',
};

type FruitFormShape = typeof EMPTY_FRUIT_FORM;

const drawerVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
  exit: { x: '100%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' as const } },
};

function FruitDrawer({
  open,
  onClose,
  editFruit,
  familyId,
}: {
  open: boolean;
  onClose: () => void;
  editFruit?: FruitItem | null;
  familyId: string;
}) {
  const qc = useQueryClient();
  const isEdit = !!editFruit;
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState<FruitFormShape>(() =>
    editFruit
      ? {
          name: editFruit.name,
          quantity: String(editFruit.quantity),
          unit: editFruit.unit ?? 'PIECES',
          purchaseDate: editFruit.purchaseDate,
          expectedRipeDate: editFruit.expectedRipeDate ?? '',
          ripenessLevel: editFruit.ripenessLevel,
          expectedRipeDays: String(editFruit.expectedRipeDays ?? '5'),
          notes: editFruit.notes ?? '',
          costPerPiece: editFruit.costPerPiece != null ? String(editFruit.costPerPiece) : '',
        }
      : { ...EMPTY_FRUIT_FORM }
  );

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const createMutation = useMutation({
    mutationFn: (data: unknown) => fruitsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fruits'] });
      qc.invalidateQueries({ queryKey: ['fruit-alerts'] });
      toast.success('Fruit added successfully');
      onClose();
    },
    onError: () => toast.error('Failed to add fruit'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: unknown) => fruitsApi.update(editFruit!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fruits'] });
      qc.invalidateQueries({ queryKey: ['fruit-alerts'] });
      toast.success('Fruit updated');
      onClose();
    },
    onError: () => toast.error('Failed to update fruit'),
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
      familyId,
      name: form.name,
      quantity: Number(form.quantity),
      unit: form.unit,
      purchaseDate: form.purchaseDate,
      expectedRipeDate: form.expectedRipeDate || undefined,
      ripenessLevel: form.ripenessLevel,
      ripnessLevel: form.ripenessLevel,
      expectedRipeDays: parseInt(form.expectedRipeDays) || 5,
      notes: form.notes || undefined,
      costPerPiece: form.costPerPiece ? parseFloat(form.costPerPiece) : undefined,
    };
    if (isEdit) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

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
                <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Edit Fruit' : 'Add Fruit'}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{isEdit ? 'Update fruit details' : 'Track a new fruit'}</p>
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-sm p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Fruit Name <span className="text-red-400">*</span></label>
                <input
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. Bananas"
                  className={cn('input', errors.name && 'border-red-400')}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Quantity <span className="text-red-400">*</span></label>
                  <input
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => set('quantity', e.target.value)}
                    placeholder="0"
                    className={cn('input', errors.quantity && 'border-red-400')}
                  />
                  {errors.quantity && <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Unit</label>
                  <select value={form.unit} onChange={(e) => set('unit', e.target.value)} className="select">
                    {UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Purchase Date + Expiry Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Purchase Date</label>
                  <input
                    type="date"
                    value={form.purchaseDate}
                    onChange={(e) => set('purchaseDate', e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expected Expiry</label>
                  <input
                    type="date"
                    value={form.expectedRipeDate}
                    onChange={(e) => set('expectedRipeDate', e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              {/* Ripeness level */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ripeness Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {RIPENESS_LEVELS.map((r) => {
                    const cfg = getRipenessConfig(r.value);
                    const active = form.ripenessLevel === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => set('ripenessLevel', r.value)}
                        className={cn(
                          'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left flex items-center gap-2',
                          active ? 'border-emerald-500 shadow-sm scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={active ? { borderColor: cfg.ringColor, backgroundColor: cfg.ringTrack } : {}}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cfg.ringColor }} />
                        {cfg.label}
                      </button>
                    );
                  })}
                  {/* EXPIRED option not in RIPENESS_LEVELS but we allow it */}
                  <button
                    type="button"
                    onClick={() => set('ripenessLevel', 'EXPIRED')}
                    className={cn(
                      'px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all text-left flex items-center gap-2',
                      form.ripenessLevel === 'EXPIRED' ? 'border-red-500 bg-red-50 shadow-sm scale-[1.02]' : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                    Expired
                  </button>
                </div>
              </div>

              {/* Expected ripe days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Expected Days to Ripe</label>
                <input
                  type="number"
                  min={1}
                  value={form.expectedRipeDays}
                  onChange={(e) => set('expectedRipeDays', e.target.value)}
                  placeholder="5"
                  className="input"
                />
              </div>

              {/* Cost per piece */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cost per Piece (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  value={form.costPerPiece}
                  onChange={(e) => set('costPerPiece', e.target.value)}
                  placeholder="0.00"
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
                  placeholder="Any additional notes…"
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
                {isPending ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save Changes' : 'Add Fruit'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Consume Mini-Modal ───────────────────────────────────────────────────────

function ConsumeModal({
  fruit,
  onClose,
}: {
  fruit: FruitItem | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [qty, setQty] = useState('1');

  const consumeMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => fruitsApi.consume(id, quantity),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fruits'] });
      qc.invalidateQueries({ queryKey: ['fruit-alerts'] });
      toast.success('Fruit consumed');
      onClose();
    },
    onError: () => toast.error('Failed to record consumption'),
  });

  if (!fruit) return null;

  const qtyNum = parseInt(qty) || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card w-full max-w-sm p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Consume {fruit.name}</h3>
            <button onClick={onClose} className="btn btn-ghost btn-sm p-1.5 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">Available: {fruit.quantity} {fruit.unit?.toLowerCase() ?? 'pcs'}</p>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => setQty((v) => String(Math.max(1, parseInt(v || '1') - 1)))}
              className="btn btn-outline btn-sm w-10 h-10 p-0 rounded-full"
            >−</button>
            <input
              type="number"
              value={qty}
              min={1}
              max={fruit.quantity}
              onChange={(e) => setQty(e.target.value)}
              className="input text-center font-bold text-lg flex-1"
            />
            <button
              onClick={() => setQty((v) => String(Math.min(fruit.quantity, parseInt(v || '0') + 1)))}
              className="btn btn-outline btn-sm w-10 h-10 p-0 rounded-full"
            >+</button>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-outline btn-md flex-1">Cancel</button>
            <button
              onClick={() => consumeMutation.mutate({ id: fruit.id, quantity: qtyNum })}
              disabled={consumeMutation.isPending || qtyNum <= 0 || qtyNum > fruit.quantity}
              className="btn btn-primary btn-md flex-1"
            >
              {consumeMutation.isPending ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FruitsPage() {
  const { selectedFamilyId } = useFamily();
  const qc = useQueryClient();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editFruit, setEditFruit] = useState<FruitItem | null>(null);
  const [consumeFruit, setConsumeFruit] = useState<FruitItem | null>(null);

  const { data: fruitsData, isLoading } = useQuery({
    queryKey: ['fruits', selectedFamilyId],
    queryFn: () =>
      fruitsApi.list(selectedFamilyId!).then((r) => {
        const list = Array.isArray(r.data.data) ? r.data.data : [];
        return list.map((f: Record<string, unknown>) => ({
          ...f,
          quantity: (f.remainingQty as number | undefined) ?? (f.quantity as number),
          originalQuantity: f.quantity as number,
          ripenessLevel: (f.ripnessLevel as string | undefined) ?? (f.ripenessLevel as string),
          expectedRipeDate: (f.expiryDate as string | undefined) ?? (f.expectedRipeDate as string | undefined),
        })) as FruitItem[];
      }),
    enabled: !!selectedFamilyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fruitsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fruits'] });
      qc.invalidateQueries({ queryKey: ['fruit-alerts'] });
      toast.success('Fruit removed');
    },
    onError: () => toast.error('Failed to delete fruit'),
  });

  const fruits: FruitItem[] = fruitsData ?? [];

  const openAdd = () => { setEditFruit(null); setDrawerOpen(true); };
  const openEdit = (f: FruitItem) => { setEditFruit(f); setDrawerOpen(true); };

  if (!selectedFamilyId) {
    return (
      <>
        <Header title="Fruit Tracker" description="Monitor your fruits and reduce waste" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center text-4xl mb-4">🍎</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Family Selected</h2>
          <p className="text-sm text-gray-500">Please create or join a family to track fruits.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Fruit Tracker" description="Monitor freshness and reduce waste" />

      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">

        {/* Summary bar */}
        {!isLoading && fruits.length > 0 && <SummaryBar fruits={fruits} />}

        {/* Top controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-500 font-medium">
              {isLoading ? '…' : `${fruits.length} fruit${fruits.length !== 1 ? 's' : ''} tracked`}
            </span>
          </div>
          <button onClick={openAdd} className="btn btn-primary btn-md">
            <Plus className="w-4 h-4" /> Add Fruit
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <FruitSkeleton />
        ) : fruits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="text-8xl mb-5">🍎</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No fruits tracked yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Add fruits to monitor freshness, track ripeness, and get alerts before they expire.
            </p>
            <button onClick={openAdd} className="btn btn-primary btn-lg">
              <Plus className="w-4 h-4" /> Add First Fruit
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {fruits.map((fruit, i) => (
                <FruitCard
                  key={fruit.id}
                  fruit={fruit}
                  index={i}
                  onEdit={openEdit}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onConsume={setConsumeFruit}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add/Edit Drawer */}
      <FruitDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditFruit(null); }}
        editFruit={editFruit}
        familyId={selectedFamilyId}
      />

      {/* Consume Modal */}
      <AnimatePresence>
        {consumeFruit && (
          <ConsumeModal
            fruit={consumeFruit}
            onClose={() => setConsumeFruit(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
