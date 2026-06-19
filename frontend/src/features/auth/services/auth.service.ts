import api from '../../../services/api';
import type { AuthUser } from '../../../types/auth';

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
  isDocente?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

// The JWT now lives in an httpOnly cookie, so the response body only
// carries the user profile the SPA needs to render.
export interface AuthResponse {
  user: AuthUser;
}

// Login extends AuthResponse with the daily streak bonus the backend
// awards once per calendar day. 0 for teachers and for already-logged-in
// students; > 0 the first login of the day. The UI uses it to flash a
// confirmation banner so the player notices the XP gain.
export interface LoginResponse extends AuthResponse {
  streak_bonus_xp: number;
}

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', data),

  logout: () => api.post<void>('/auth/logout'),

  // Used on app startup to verify the cookie session is still valid
  // and to rehydrate the user without trusting any client-side store.
  me: () => api.get<AuthResponse>('/auth/me'),
};
