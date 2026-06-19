import { create } from 'zustand';
import { authService, type LoginPayload, type RegisterPayload } from '../services/auth.service';
import type { AuthUser } from '../../../types/auth';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  // XP awarded by the most recent successful login (daily streak bonus).
  // Set to a positive number once per calendar day per student; consumed
  // by the dashboard to flash a "+N XP por racha" notice and then cleared.
  streakBonusXp: number;
  login: (data: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  clearStreakBonus: () => void;
  hydrate: () => Promise<void>;
}

// We only cache the user profile (non-sensitive) in localStorage so the
// UI has something to render before /auth/me resolves. The JWT itself
// lives in an httpOnly cookie and is never exposed to JavaScript.
const USER_KEY = 'user';

function loadCachedUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadCachedUser(),
  isLoading: false,
  error: null,
  streakBonusXp: 0,

  hydrate: async () => {
    // Confirm the session cookie is still valid by asking the server.
    // If it isn't, /auth/me returns 401 and the axios interceptor will
    // wipe the cached user and redirect to /login.
    try {
      const response = await authService.me();
      const user = response.data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user });
    } catch {
      localStorage.removeItem(USER_KEY);
      set({ user: null });
    }
  },

  login: async (data) => {
    set({ isLoading: true, error: null });

    try {
      const response = await authService.login(data);
      const { user, streak_bonus_xp } = response.data;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({
        user,
        isLoading: false,
        streakBonusXp: streak_bonus_xp ?? 0,
      });
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Error al iniciar sesión');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });

    try {
      await authService.register(data);
      // Registration emits cookies but we leave the SPA in a logged-out
      // visual state — the existing UX redirects to /login after register.
      localStorage.removeItem(USER_KEY);
      set({ user: null, isLoading: false, error: null });
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, 'Error al registrarse');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Even if the network call fails (e.g. already expired), drop local
      // state. The server cookie will eventually expire on its own.
    }
    localStorage.removeItem(USER_KEY);
    set({ user: null });
  },

  clearError: () => set({ error: null }),

  clearStreakBonus: () => set({ streakBonusXp: 0 }),
}));
