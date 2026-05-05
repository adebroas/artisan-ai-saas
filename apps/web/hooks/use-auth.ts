import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuth = create<AuthState>(() => ({
  user: {
    id: 'demo',
    email: 'arnaud@plomberie-dupont.fr',
    firstName: 'Arnaud',
    lastName: 'Dupont',
    role: 'admin',
    isActive: true,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  },
  token: 'demo-token',
  isAuthenticated: true,
  login: () => {},
  logout: () => {},
  hydrate: () => {},
}));