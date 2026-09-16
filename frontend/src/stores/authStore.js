import { create } from 'zustand';
import { apiLogin, apiRegister, apiGetMe } from '../services/api';

const TOKEN_KEY = 'ai_voice_auth_token';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),
  isLoading: false,
  error: null,

  /**
   * Clear error message
   */
  clearError: () => set({ error: null }),

  /**
   * Log in existing user
   */
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiLogin(email, password);
      const { access_token, user } = response;
      localStorage.setItem(TOKEN_KEY, access_token);
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Login failed',
      });
      return { success: false, error: err.message };
    }
  },

  /**
   * Register new user
   */
  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiRegister(email, password);
      const { access_token, user } = response;
      localStorage.setItem(TOKEN_KEY, access_token);
      set({
        token: access_token,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return { success: true };
    } catch (err) {
      set({
        isLoading: false,
        error: err.message || 'Registration failed',
      });
      return { success: false, error: err.message };
    }
  },

  /**
   * Log out current user
   */
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /**
   * Restore user profile on app load using existing token
   */
  initialize: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isAuthenticated: false, user: null, isLoading: false });
      return;
    }

    set({ isLoading: true });
    try {
      const user = await apiGetMe(token);
      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err) {
      // Token is expired or invalid
      localStorage.removeItem(TOKEN_KEY);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
