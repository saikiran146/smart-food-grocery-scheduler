'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Users, LogOut, Plus, Copy, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/hooks/useAuth';
import { useFamily } from '@/hooks/useFamily';
import { familiesApi, usersApi } from '@/lib/api/endpoints';
import { DIETARY_PREFERENCES } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, fetchMe, logout } = useAuth();
  const { selectedFamilyId, setSelectedFamily } = useFamily();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'family'>('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name ?? '', dietaryPreference: user?.dietaryPreference ?? 'VEGETARIAN' });
  const [familyForm, setFamilyForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: families } = useQuery({
    queryKey: ['families'],
    queryFn: () => familiesApi.list().then((r) => r.data.data),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => usersApi.updateMe(data),
    onSuccess: () => { fetchMe(); toast.success('Profile updated!'); },
    onError: () => toast.error('Failed to update profile'),
  });

  const createFamilyMutation = useMutation({
    mutationFn: (data: any) => familiesApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      setSelectedFamily(res.data.data.id);
      setFamilyForm({ name: '', description: '' });
      toast.success('Family created!');
    },
  });

  const joinFamilyMutation = useMutation({
    mutationFn: (code: string) => familiesApi.join(code),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      setSelectedFamily(res.data.data.id);
      setJoinCode('');
      toast.success('Joined family!');
    },
    onError: () => toast.error('Invalid invite code'),
  });

  const copyInviteCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success('Invite code copied!');
  };

  return (
    <div>
      <Header title="Settings" description="Manage your profile and family" />

      <div className="p-6 max-w-2xl">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6 w-fit">
          {(['profile', 'family'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium capitalize transition-all',
                activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600',
              )}
            >
              {tab === 'profile' ? <span className="flex items-center gap-2"><User className="w-4 h-4" />Profile</span> : <span className="flex items-center gap-2"><Users className="w-4 h-4" />Family</span>}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Profile Settings</h2>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-2xl object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-primary">{user?.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Dietary Preference</label>
              <select
                value={profileForm.dietaryPreference}
                onChange={(e) => setProfileForm((f) => ({ ...f, dietaryPreference: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-primary bg-white text-sm outline-none"
              >
                {DIETARY_PREFERENCES.map((p) => (
                  <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => updateProfileMutation.mutate(profileForm)}
              disabled={updateProfileMutation.isPending}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={logout}
                className="flex items-center gap-2 text-red-500 hover:text-red-600 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Family Tab */}
        {activeTab === 'family' && (
          <div className="space-y-4">
            {/* Existing Families */}
            {(families ?? []).map((family: any) => (
              <div
                key={family.id}
                className={cn(
                  'bg-white rounded-xl border p-5 cursor-pointer transition-all',
                  selectedFamilyId === family.id ? 'border-primary ring-2 ring-primary/20' : 'border-gray-100 hover:border-gray-200',
                )}
                onClick={() => setSelectedFamily(family.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{family.name}</h3>
                      {selectedFamilyId === family.id && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">Active</span>
                      )}
                    </div>
                    {family.description && <p className="text-sm text-gray-500 mt-0.5">{family.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">{family.members?.length ?? 0} members</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Invite Code</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); copyInviteCode(family.inviteCode); }}
                      className="flex items-center gap-1 text-xs font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200 transition-colors"
                    >
                      {copiedCode === family.inviteCode ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      {family.inviteCode?.slice(0, 8)}...
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Create Family */}
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create New Family
              </h3>
              <div className="space-y-3">
                <input
                  value={familyForm.name}
                  onChange={(e) => setFamilyForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Family name (e.g., The Sharma Family)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
                <input
                  value={familyForm.description}
                  onChange={(e) => setFamilyForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
                <button
                  onClick={() => createFamilyMutation.mutate(familyForm)}
                  disabled={!familyForm.name || createFamilyMutation.isPending}
                  className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Create Family
                </button>
              </div>
            </div>

            {/* Join Family */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="font-medium text-gray-900 mb-3">Join Existing Family</h3>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter invite code"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-primary outline-none"
                />
                <button
                  onClick={() => joinFamilyMutation.mutate(joinCode)}
                  disabled={!joinCode || joinFamilyMutation.isPending}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
