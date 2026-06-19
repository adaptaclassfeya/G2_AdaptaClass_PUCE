import api from '../../../services/api';

// ─── Response shape (mirrors backend DashboardService.getTeacherMetrics) ───

export interface DashboardScopeParalelo {
  id: string;
  nombre: string;
  grado: number;
}

export interface DashboardTotals {
  students: number;
  attempts: number;
  correct: number;
  accuracy: number; // 0–100
  sessions: number;
  minutes: number;
}

export interface TemaRow {
  tema: string;
  total: number;
  correctas: number;
  accuracy: number; // 0–100
}

export interface EvolucionRow {
  fecha: string; // YYYY-MM-DD (UTC)
  total: number;
  correctas: number;
  accuracy: number; // 0–100
}

export interface MinijuegoRow {
  titulo: string;
  sesiones: number;
  minutos: number;
}

export interface EstudianteRow {
  user_id: string;
  nombre: string;
  racha_dias: number;
  puntos_xp: number;
  intentos: number;
  correctas: number;
  accuracy: number; // 0–100
}

export interface TeacherDashboardData {
  scope: {
    paralelos: DashboardScopeParalelo[];
    paraleloId: string | null;
    studentCount: number;
  };
  totals: DashboardTotals;
  porTema: TemaRow[];
  evolucion: EvolucionRow[];
  minijuegos: MinijuegoRow[];
  estudiantes: EstudianteRow[];
}

// ─── Admin (platform-wide) response shape ──────────────────────────────────

export interface AdminTotals {
  students: number;
  teachers: number;
  users: number;
  sessions: number;
  minutes: number;
  questions: number;
  sources: number;
}

export interface CrecimientoRow {
  periodo: string; // YYYY-MM (UTC)
  estudiantes: number; // cumulative
  profesores: number; // cumulative
  nuevosEstudiantes: number;
  nuevosProfesores: number;
}

export interface ActividadRow {
  periodo: string; // YYYY-MM (UTC)
  sesiones: number;
}

export interface TopJuegoRow {
  titulo: string;
  minutos: number;
  sesiones: number;
}

export interface IaAdopcionRow {
  teacher_id: string;
  nombre: string;
  documentos: number;
  preguntas: number;
}

export interface AdminDashboardData {
  totals: AdminTotals;
  crecimiento: CrecimientoRow[];
  actividad: ActividadRow[];
  topJuegos: TopJuegoRow[];
  iaAdopcion: IaAdopcionRow[];
}

export const dashboardService = {
  // `paraleloId` omitted/empty → all of the teacher's students.
  getTeacherMetrics: (paraleloId?: string) =>
    api.get<TeacherDashboardData>('/dashboard/teacher', {
      params: paraleloId ? { paraleloId } : undefined,
    }),

  // Platform-wide aggregates (ADMIN only).
  getAdminMetrics: () => api.get<AdminDashboardData>('/dashboard/admin'),
};
