'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, fetchMe, accessToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) {
      router.replace('/auth/login');
    } else if (!isAuthenticated) {
      fetchMe();
    }
  }, [accessToken, isAuthenticated, fetchMe, router]);

  if (!accessToken) return null;

  return (
    <div className="flex h-screen bg-gray-50/80 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
