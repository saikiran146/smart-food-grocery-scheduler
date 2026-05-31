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
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/meal-planner',  label: 'Meal Planner',   icon: Calendar },
  { href: '/inventory',     label: 'Inventory',      icon: Package },
  { href: '/shopping',      label: 'Shopping',       icon: ShoppingCart },
  { href: '/waste',         label: 'Waste Tracker',  icon: Trash2 },
  { href: '/fruits',        label: 'Fruit Tracker',  icon: Apple },
  { href: '/recipes',       label: 'Recipes',        icon: BookOpen },
  { href: '/analytics',     label: 'Analytics',      icon: BarChart3 },
  { href: '/notifications', label: 'Notifications',  icon: Bell },
  { href: '/settings',      label: 'Settings',       icon: Settings },
];

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick?: () => void;
}

function NavItem({ href, label, icon: Icon, active, onClick }: NavItemProps) {
  return (
    <motion.div
      whileHover={{ x: active ? 0 : 3 }}
      transition={{ duration: 0.15 }}
    >
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          'relative group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 overflow-hidden',
          active
            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/6',
        )}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-full" />
        )}
        <Icon
          className={cn(
            'w-4 h-4 shrink-0 transition-all duration-150',
            active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />
        <span className="truncate">{label}</span>
        {active && (
          <motion.span
            layoutId="active-dot"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400"
          />
        )}
      </Link>
    </motion.div>
  );
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials = user?.name
    ?.split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?';

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/8">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
            boxShadow: '0 4px 12px rgba(5,150,105,0.40)',
          }}
        >
          <ChefHat className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white leading-tight tracking-tight">FoodScheduler</p>
          <p className="text-[11px] text-slate-500 font-medium">Smart Kitchen AI</p>
        </div>
      </div>

      {/* AI Assistant quick access button */}
      <div className="px-4 pt-4 pb-2">
        <motion.div
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(16,185,129,0)',
              '0 0 0 6px rgba(16,185,129,0.15)',
              '0 0 0 0 rgba(16,185,129,0)',
            ],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-xl"
        >
          <Link
            href="/ai-suggestions"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/15 border border-emerald-500/25 text-emerald-300 text-sm font-semibold hover:from-emerald-600/35 hover:to-teal-600/25 transition-all duration-150"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>AI Assistant</span>
            <span className="ml-auto text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold tracking-wide">
              NEW
            </span>
          </Link>
        </motion.div>
      </div>

      {/* Nav label */}
      <p className="px-5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
        Navigation
      </p>

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
      <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/8 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-blue-600/25 border border-blue-500/30 flex items-center justify-center shrink-0">
          <Users className="w-3.5 h-3.5 text-blue-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide">Family</p>
          <p className="text-xs font-semibold text-slate-300 truncate">
            {(user as any)?.families?.[0]?.name ?? 'No family yet'}
          </p>
        </div>
      </div>

      {/* User footer */}
      <div className="px-4 pb-4 pt-3 border-t border-white/8">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full ring-2 ring-emerald-500/40 shrink-0 object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
            >
              <span className="text-[11px] font-bold text-white">{initials}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {user?.name ?? 'User'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </motion.button>
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
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-slate-900 text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </motion.button>

      {/* Mobile overlay + sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              key="mobile-sidebar"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed top-0 left-0 z-50 h-full w-64 shadow-2xl"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
