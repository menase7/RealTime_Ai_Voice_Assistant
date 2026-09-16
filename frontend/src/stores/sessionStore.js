import { create } from 'zustand';
import { useAuthStore } from './authStore';
import { 
  apiCreateSession, 
  apiGetSessions, 
  apiGetSession, 
  apiDeleteSession 
} from '../services/api';

export const useSessionStore = create((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  /**
   * Fetch all voice sessions for the current user
   */
  fetchSessions: async () => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const data = await apiGetSessions(token);
      set({ sessions: data, isLoading: false });
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err.message || 'Failed to fetch voice sessions' 
      });
    }
  },

  /**
   * Create a new voice session
   */
  createSession: async (title) => {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false, error: 'Not authenticated' };

    set({ isLoading: true, error: null });
    try {
      const newSession = await apiCreateSession(token, title);
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        currentSession: newSession,
        isLoading: false,
      }));
      return { success: true, session: newSession };
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err.message || 'Failed to create session' 
      });
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieve a single session by its ID
   */
  fetchSessionById: async (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const session = await apiGetSession(token, sessionId);
      set({ currentSession: session, isLoading: false });
      return session;
    } catch (err) {
      set({ 
        isLoading: false, 
        error: err.message || 'Failed to load session details' 
      });
      return null;
    }
  },

  /**
   * Delete an existing session
   */
  deleteSession: async (sessionId) => {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false };

    try {
      await apiDeleteSession(token, sessionId);
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
        currentSession: state.currentSession?.id === sessionId ? null : state.currentSession,
      }));
      return { success: true };
    } catch (err) {
      set({ error: err.message || 'Failed to delete session' });
      return { success: false, error: err.message };
    }
  },

  setCurrentSession: (session) => set({ currentSession: session }),
}));
