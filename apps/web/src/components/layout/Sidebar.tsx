'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, ShoppingCart, Package, Trash2,
  Apple, BookOpen, BarChart3, Bell, Settings, ChefHat,
  LogOut, Menu, X, Users, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/meal-planner', label: 'Meal Planner',   icon: Calendar },
  { href: '/inventory',    label: 'Inventory',      icon: Package },
  { href: '/shopping',     label: 'Shopping',       icon: ShoppingCart },
  { href: '/waste',        label: 'Waste Tracker',  icon: Trash2 },
  { href: '/fruits',       label: 'Fruit Tracker',  icon: Apple },
  { href: '/recipes',      label: 'Recipes',        icon: BookOpen },
  { href: '/analytics',    label: 'Analytics',      icon: BarChart3 },
  { href: '/notifications',label: 'Notifications',  icon: Bell },
  { href: '/settings',     label: 'Settings',       icon: Settings },
];

function NavItem({ href, label, icon: Icon, active, onClick }: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        active
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/30'
          : 'text-slate-400 hover:text-white hover:bg-white/10',
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0 transition-transform duration-150', active ? '' : 'group-hover:scale-110')} />
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
    </Link>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials = user?.name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50 shrink-0">
          <ChefHat className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight">FoodScheduler</p>
          <p className="text-[11px] text-slate-400">Smart Kitchen AI</p>
        </div>
      </div>

      {/* AI Quick Access */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/ai-suggestions"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:from-emerald-600/40 hover:to-teal-600/30 transition-all duration-150"
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>AI Suggestions</span>
          <span className="ml-auto text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-semibold">NEW</span>
        </Link>
      </div>

      {/* Nav label */}
      <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Navigation</p>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-2">
        {navItems.map(({ href, label, icon }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            icon={icon}
            active={pathname === href || pathname.startsWith(href + '/')}
            onClick={onClose}
          />
        ))}
      </nav>

      {/* Family chip */}
      <div className="mx-4 mb-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0">
          <Users className="w-3.5 h-3.5 text-blue-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">Family</p>
          <p className="text-xs font-semibold text-slate-300 truncate">
            {(user as any)?.families?.[0]?.name ?? 'No family yet'}
          </p>
        </div>
      </div>

      {/* User footer */}
      <div className="px-4 pb-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full ring-2 ring-emerald-600/40 shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name ?? 'User'}</p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-900 text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed top-0 left-0 z-50 h-full w-64 shadow-2xl transform transition-transform duration-200 ease-in-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
