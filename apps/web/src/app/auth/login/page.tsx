'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChefHat, Mail, Lock, Eye, EyeOff, ArrowRight, Leaf, BarChart3, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

const features = [
  { icon: ChefHat, label: 'Smart meal planning' },
  { icon: Leaf,     label: 'Reduce food waste' },
  { icon: BarChart3,label: 'Track spending' },
  { icon: ShoppingBag, label: 'Auto shopping lists' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await login(data.email, data.password);
      router.replace('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[46%] bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-600/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-600/15 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/50">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">FoodScheduler</span>
        </div>

        {/* Hero text */}
        <div className="relative space-y-6">
          <div className="space-y-3">
            <p className="text-emerald-400 text-sm font-semibold tracking-widest uppercase">Smart Kitchen AI</p>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Eat better.<br />
              Waste less.<br />
              <span className="text-emerald-400">Save more.</span>
            </h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm">
              AI-powered meal planning and grocery management designed for Indian households.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-sm text-slate-300 font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-slate-600 text-xs">© 2026 FoodScheduler. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="text-slate-900 font-bold text-lg">FoodScheduler</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">!</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="you@example.com"
                    className="input pl-10"
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">⚠ {errors.email.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <button type="button" className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary btn-lg w-full mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white text-xs text-gray-400 font-medium">or continue with</span>
              </div>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL}/auth/google`}
              className="btn-outline btn-lg w-full"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
                Create one free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
