'use client';

import { Bell, Search } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/endpoints';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  const { data } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const unreadCount = data?.count ?? 0;

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100/80 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[17px] font-bold text-gray-900 leading-tight tracking-tight">{title}</h1>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5 font-medium">{description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Actions slot */}
          {actions}

          {/* Search */}
          <button className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-gray-200 transition-colors text-sm">
            <Search className="w-3.5 h-3.5" />
            <span className="text-xs">Search</span>
            <kbd className="ml-1 text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-400">⌘K</kbd>
          </button>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
