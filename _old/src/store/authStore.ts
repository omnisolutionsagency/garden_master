import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import * as auth from '../services/auth';

interface AuthStore {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      const session = await auth.getSession();
      const user = session ? (await auth.getUser()) : null;
      set({ session, user, isInitialized: true });

      // Listen for auth changes (token refresh, sign out from another tab, etc.)
      auth.onAuthStateChange((newSession) => {
        set({
          session: newSession,
          user: newSession?.user || null,
        });
      });
    } catch {
      set({ isInitialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { session, user } = await auth.signIn(email, password);
      set({ session, user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signUp: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const { session, user } = await auth.signUp(email, password, name);
      set({ session, user, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await auth.signOut();
      set({ user: null, session: null, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await auth.resetPassword(email);
      set({ isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
