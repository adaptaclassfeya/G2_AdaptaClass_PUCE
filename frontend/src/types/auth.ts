export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  nombre: string;
  /** null if student has not joined a paralelo yet */
  paralelo_id: string | null;
  /** Gamification fields. Defaulted to 0 by the backend for teachers. */
  puntos_xp: number;
  racha_dias: number;
}
