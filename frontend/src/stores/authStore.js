// Zustand Auth Store (To be implemented in Phase 2)
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
}));
