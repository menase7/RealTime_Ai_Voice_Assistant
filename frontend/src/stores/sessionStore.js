// Zustand Session Store (To be implemented in Phase 3)
import { create } from 'zustand';

export const useSessionStore = create((set) => ({
  sessions: [],
  currentSession: null,
}));
