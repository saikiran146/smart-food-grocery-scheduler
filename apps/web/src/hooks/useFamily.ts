'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FamilyState {
  selectedFamilyId: string | null;
  setSelectedFamily: (id: string) => void;
}

export const useFamily = create<FamilyState>()(
  persist(
    (set) => ({
      selectedFamilyId: null,
      setSelectedFamily: (id) => set({ selectedFamilyId: id }),
    }),
    { name: 'family-store' },
  ),
);
