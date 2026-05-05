import { create } from 'zustand';
import { Business } from '@/types';

interface BusinessState {
  currentBusiness: Business | null;
  setCurrentBusiness: (business: Business) => void;
}

export const useBusiness = create<BusinessState>((set) => ({
  currentBusiness: null,
  setCurrentBusiness: (business) => set({ currentBusiness: business }),
}));