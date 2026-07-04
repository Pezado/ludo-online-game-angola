import { create } from 'zustand';
import { User, LudoMatch } from '../types';

interface LudoStore {
  user: User | null;
  theme: 'dark' | 'light';
  currentMatch: LudoMatch | null;
  setUser: (user: User | null) => void;
  setCurrentMatch: (match: LudoMatch | null) => void;
  toggleTheme: () => void;
}

export const useRenewStore = create<LudoStore>((set) => ({
  user: null,
  theme: 'dark',
  currentMatch: null,
  setUser: (user) => set({ user }),
  setCurrentMatch: (currentMatch) => set({ currentMatch }),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (nextTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
    return { theme: nextTheme };
  }),
}));
