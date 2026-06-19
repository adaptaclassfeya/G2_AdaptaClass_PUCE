import api from '../../../services/api';
import type { Paralelo } from '../types/paralelo.types';

// Shape returned by GET /paralelos/:id — includes the inscribed students.
export interface ParaleloDetail extends Paralelo {
  students: Array<{
    user_id: string;
    nombre: string;
    puntos_xp: number;
    racha_dias: number;
    paralelo_id: string | null;
    user: { email: string };
  }>;
}

export interface RankingEntry {
  rank: number;
  user_id: string;
  nombre: string;
  puntos_xp: number;
  racha_dias: number;
}

export const paralelosService = {
  create: (data: { nombre: string; grado: number }) =>
    api.post<Paralelo>('/paralelos', data),

  // Used by students from their dashboard to join a paralelo via access code.
  join: (codigo_acceso: string) =>
    api.post<{ paralelo: Paralelo }>('/paralelos/join', { codigo_acceso }),

  // Student exits their current paralelo. Idempotent — the backend reports
  // `alreadyOut` if there was nothing to detach.
  leave: () => api.post<{ ok: boolean; alreadyOut: boolean }>('/paralelos/leave'),

  getAll: () => api.get<Paralelo[]>('/paralelos'),

  getOne: (id: string) => api.get<ParaleloDetail>(`/paralelos/${id}`),

  // Rotates the access code. The old code stops working immediately;
  // already-joined students stay attached.
  rotateCode: (id: string) => api.patch<Paralelo>(`/paralelos/${id}/rotate-code`),

  // Both roles can call this; the backend enforces who can see which
  // paralelo's ranking.
  ranking: (id: string) => api.get<RankingEntry[]>(`/paralelos/${id}/ranking`),
};
