'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  CheckCheck,
  X,
  AlertTriangle,
  Package,
  UtensilsCrossed,
  Settings,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/layout/Header';
import { notificationsApi } from '@/lib/api/endpoints';
import { cn } from '@/lib/utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type NotificationStatus = 'PENDING' | 'SENT' | 'READ';
type NotificationType = 'EXPIRING_SOON' | 'EXPIRED' | 'LOW_STOCK' | 'MEAL_REMINDER' | 'SYSTEM';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
}

interface NotificationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface NotificationsResponse {
  items: Notification[];
  meta: NotificationMeta;
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; iconClass: string; chipClass: string; label: string }
> = {
  EXPIRING_SOON: {
    icon: Bell,
    iconClass: 'text-orange-500',
    chipClass: 'bg-orange-50 ring-1 ring-orange-200/60',
    label: 'Expiring Soon',
  },
  EXPIRED: {
    icon: AlertTriangle,
    iconClass: 'text-red-500',
    chipClass: 'bg-red-50 ring-1 ring-red-200/60',
    label: 'Expired',
  },
  LOW_STOCK: {
    icon: Package,
    iconClass: 'text-amber-500',
    chipClass: 'bg-amber-50 ring-1 ring-amber-200/60',
    label: 'Low Stock',
  },
  MEAL_REMINDER: {
    icon: UtensilsCrossed,
    iconClass: 'text-blue-500',
    chipClass: 'bg-blue-50 ring-1 ring-blue-200/60',
    label: 'Meal',
  },
  SYSTEM: {
    icon: Settings,
    iconClass: 'text-gray-500',
    chipClass: 'bg-gray-100 ring-1 ring-gray-200/60',
    label: 'System',
  },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type as NotificationType] ?? TYPE_CONFIG.SYSTEM;
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'unread' | 'expiry' | 'meals' | 'system';

interface TabDef {
  id: FilterTab;
  label: string;
  icon: string;
  statusFilter?: NotificationStatus[];
  typeFilter?: NotificationType[];
}

const TABS: TabDef[] = [
  { id: 'all', label: 'All', icon: '' },
  { id: 'unread', label: 'Unread', icon: '' },
  { id: 'expiry', label: 'Expiry', icon: '🔔', typeFilter: ['EXPIRING_SOON', 'EXPIRED'] },
  { id: 'meals', label: 'Meals', icon: '🍽', typeFilter: ['MEAL_REMINDER'] },
  { id: 'system', label: 'System', icon: '⚙', typeFilter: ['SYSTEM'] },
];

// ─── Date group helpers ───────────────────────────────────────────────────────

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  const startOfWeek = new Date(startOfToday.getTime() - 6 * 86400000);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  return 'Earlier';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'This Week', 'Earlier'];

// ─── Animation variants ───────────────────────────────────────────────────────

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, type: 'spring', stiffness: 300, damping: 26 },
  }),
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
    transition: { duration: 0.22, ease: 'easeInOut' },
  },
};

// ─── Notification item ────────────────────────────────────────────────────────

interface NotifItemProps {
  notif: Notification;
  index: number;
  onRead: () => void;
  onDelete: () => void;
  isMarkingRead: boolean;
  isDeleting: boolean;
}

function NotifItem({ notif, index, onRead, onDelete, isMarkingRead, isDeleting }: NotifItemProps) {
  const isUnread = notif.status === 'PENDING' || notif.status === 'SENT';
  const cfg = getTypeConfig(notif.type);
  const Icon = cfg.icon;

  const relativeTime = (() => {
    try {
      return formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      onClick={() => { if (isUnread && !isMarkingRead) onRead(); }}
      className={cn(
        'group relative flex items-start gap-4 px-5 py-4 rounded-2xl border transition-all duration-200',
        isUnread
          ? 'bg-white border-gray-100 shadow-[var(--shadow-sm)] cursor-pointer hover:border-emerald-200 hover:shadow-[var(--shadow-md)]'
          : 'bg-gray-50/50 border-transparent cursor-default',
      )}
    >
      {/* Icon chip */}
      <div className={cn('shrink-0 w-10 h-10 rounded-xl flex items-center justify-center', cfg.chipClass)}>
        <Icon className={cn('w-5 h-5', cfg.iconClass)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm leading-snug', isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-600')}>
              {notif.title}
            </p>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {isMarkingRead ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : null}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-50 transition-all"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            </motion.button>
          </div>
        </div>

        {/* Time */}
        <p className="text-xs text-gray-400 mt-1.5">{relativeTime}</p>
      </div>

      {/* Unread dot */}
      <AnimatePresence>
        {isUnread && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="shrink-0 w-2 h-2 rounded-full bg-emerald-500 mt-2"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ─── Build API params ───────────────────────────────────────────────────────

  const tabDef = TABS.find((t) => t.id === activeTab)!;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['notifications', activeTab, page],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 20 };
      if (activeTab === 'unread') params.status = 'PENDING';
      const res = await notificationsApi.list(params);
      return res.data.data as NotificationsResponse;
    },
    placeholderData: (prev) => prev,
  });

  const allItems: Notification[] = data?.items ?? [];
  const meta = data?.meta;

  // Client-side filter for type-based tabs
  const notifications: Notification[] = tabDef.typeFilter
    ? allItems.filter((n) => tabDef.typeFilter!.includes(n.type as NotificationType))
    : allItems;

  const unreadCount = allItems.filter((n) => n.status === 'PENDING' || n.status === 'SENT').length;

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: (id) => {
      setMarkingReadId(id);
      // Optimistic update
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((n: Notification) =>
            n.id === id ? { ...n, status: 'READ', readAt: new Date().toISOString() } : n,
          ),
        };
      });
    },
    onSuccess: () => {
      setMarkingReadId(null);
      invalidate();
    },
    onError: () => {
      setMarkingReadId(null);
      invalidate();
      toast.error('Failed to mark as read');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onMutate: () => setMarkingAllRead(true),
    onSuccess: () => {
      setMarkingAllRead(false);
      invalidate();
      toast.success('All notifications marked as read');
    },
    onError: () => {
      setMarkingAllRead(false);
      invalidate();
      toast.error('Failed to mark all as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onMutate: (id) => {
      setDeletingId(id);
      // Optimistic remove
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old: any) => {
        if (!old?.items) return old;
        return { ...old, items: old.items.filter((n: Notification) => n.id !== id) };
      });
    },
    onSuccess: () => {
      setDeletingId(null);
      invalidate();
    },
    onError: () => {
      setDeletingId(null);
      invalidate();
      toast.error('Failed to delete notification');
    },
  });

  // ─── Group notifications by date ────────────────────────────────────────────

  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const group = getDateGroup(n.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const groupKeys = GROUP_ORDER.filter((g) => grouped[g]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <Header title="Notifications" description="Stay updated on expiry alerts, meals, and shopping" />

      <div className="max-w-3xl mx-auto px-4 pb-12">
        {/* Filter bar + mark all */}
        <div className="flex items-center justify-between gap-4 py-5 sticky top-0 bg-gray-50 z-10">
          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 p-1 shadow-[var(--shadow-xs)]">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setPage(1); }}
                  className={cn(
                    'relative px-3 py-1.5 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-1',
                    isActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-gray-100 rounded-xl"
                      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1">
                    {tab.icon && <span>{tab.icon}</span>}
                    {tab.label}
                    {tab.id === 'unread' && unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center"
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </motion.span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.button
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => markAllReadMutation.mutate()}
                disabled={markingAllRead || markAllReadMutation.isPending}
                className="btn-outline btn-sm shrink-0"
              >
                {markingAllRead ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCheck className="w-4 h-4 text-emerald-500" />
                )}
                Mark all read
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-3 mt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="skeleton h-20 w-full"
              />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-24 h-24 rounded-3xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-6"
            >
              <Bell className="w-12 h-12 text-gray-200" strokeWidth={1.5} />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">All caught up!</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              You'll see meal reminders, expiry alerts, and shopping suggestions here.
            </p>
          </motion.div>
        ) : (
          /* Notification feed grouped by date */
          <div className="space-y-6">
            {groupKeys.map((group) => {
              const groupItems = grouped[group];
              return (
                <div key={group}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{group}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-300">{groupItems.length}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {groupItems.map((notif, i) => (
                        <NotifItem
                          key={notif.id}
                          notif={notif}
                          index={i}
                          onRead={() => markReadMutation.mutate(notif.id)}
                          onDelete={() => deleteMutation.mutate(notif.id)}
                          isMarkingRead={markingReadId === notif.id}
                          isDeleting={deletingId === notif.id}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}

            {/* Load more */}
            {meta && page < meta.totalPages && (
              <div className="flex justify-center pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="btn-outline btn-md"
                >
                  {isFetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  {isFetching ? 'Loading...' : 'Load more'}
                </motion.button>
              </div>
            )}

            {/* Faint fetching indicator */}
            <AnimatePresence>
              {isFetching && !isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-center py-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
