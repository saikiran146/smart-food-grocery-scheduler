'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2, ShoppingCart, Apple, Package, Calendar, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { notificationsApi } from '@/lib/api/endpoints';
import { formatRelative } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

const TYPE_ICONS: Record<string, { icon: any; color: string }> = {
  LOW_STOCK: { icon: Package, color: 'text-orange-500 bg-orange-50' },
  EXPIRING_SOON: { icon: Package, color: 'text-yellow-500 bg-yellow-50' },
  EXPIRED: { icon: Package, color: 'text-red-500 bg-red-50' },
  MEAL_REMINDER: { icon: Calendar, color: 'text-blue-500 bg-blue-50' },
  SHOPPING_REMINDER: { icon: ShoppingCart, color: 'text-purple-500 bg-purple-50' },
  FRUIT_ALERT: { icon: Apple, color: 'text-green-500 bg-green-50' },
  AI_SUGGESTION: { icon: Sparkles, color: 'text-indigo-500 bg-indigo-50' },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationsApi.list({ status: filter || undefined, limit: 50 }).then((r) => r.data.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.items ?? [];
  const unreadCount = notifications.filter((n: any) => n.status === 'PENDING' || n.status === 'SENT').length;

  return (
    <div>
      <Header title="Notifications" description="Stay updated on your grocery and meal activities" />

      <div className="p-6">
        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {['', 'PENDING', 'READ'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  filter === status ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {status === '' ? 'All' : status === 'PENDING' ? 'Unread' : 'Read'}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notification List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-gray-600 font-medium">No notifications</h3>
            <p className="text-gray-400 text-sm mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif: any) => {
              const isUnread = notif.status === 'PENDING' || notif.status === 'SENT';
              const typeConfig = TYPE_ICONS[notif.type] ?? TYPE_ICONS.AI_SUGGESTION;
              const Icon = typeConfig.icon;

              return (
                <div
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                    isUnread ? 'bg-white border-primary/20 shadow-sm' : 'bg-gray-50 border-gray-100',
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', typeConfig.color)}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={cn('text-sm font-medium', isUnread ? 'text-gray-900' : 'text-gray-600')}>
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isUnread && (
                          <button
                            onClick={() => markReadMutation.mutate(notif.id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteMutation.mutate(notif.id)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatRelative(notif.createdAt)}</p>
                  </div>

                  {isUnread && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
