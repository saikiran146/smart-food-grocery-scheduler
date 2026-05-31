'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChefHat, User, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { DIETARY_PREFERENCES } from '@/lib/constants';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  dietaryPreference: z.string().default('VEGETARIAN'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { dietaryPreference: 'VEGETARIAN' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      await registerUser(data);
      router.replace('/dashboard');
    } catch {
      setError('Could not create account. The email may already be in use.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="text-slate-900 font-bold text-lg">FoodScheduler</span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create account</h2>
            <p className="text-gray-500 text-sm mt-1">Start managing your kitchen smarter</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('name')} placeholder="Your full name" className="input pl-10" />
              </div>
              {errors.name && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input {...register('email')} type="email" placeholder="you@example.com" className="input pl-10" />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  className="input pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5">⚠ {errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dietary Preference</label>
              <select {...register('dietaryPreference')} className="input bg-white">
                {DIETARY_PREFERENCES.map((p) => (
                  <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary btn-lg w-full mt-2">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Create account <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-emerald-600 font-semibold hover:text-emerald-700">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
