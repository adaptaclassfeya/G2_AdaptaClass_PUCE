import api from '../../../services/api';

export interface Mission {
  id: string;
  paralelo: {
    id: string;
    nombre: string;
    grado: number;
  };
  tipo: 'PLAY_TIME' | 'PLAY_DISTINCT' | 'ANSWER_CORRECT';
  goal_value: number;
  descripcion: string | null;
  xp_reward: number;
  fecha_limite: string;
  created_at: string;
  completed_count: number;
  total_students: number;
}

export interface StudentProgress {
  user_id: string;
  nombre: string;
  email: string;
  current_value: number;
  completado: boolean;
  completed_at: string | null;
  xp_otorgado: boolean;
}

export interface MissionProgressDetail {
  mission_id: string;
  tipo: 'PLAY_TIME' | 'PLAY_DISTINCT' | 'ANSWER_CORRECT';
  goal_value: number;
  fecha_limite: string;
  students: StudentProgress[];
}

export interface StudentMissionItem {
  id: string;
  tipo: 'PLAY_TIME' | 'PLAY_DISTINCT' | 'ANSWER_CORRECT';
  goal_value: number;
  descripcion: string | null;
  // Reward the student WILL receive (configured by the teacher).
  xp_reward: number;
  current_value: number;
  completado: boolean;
  fecha_limite: string;
  // Reward already credited (0 until completion, then equals xp_reward).
  xp_ganado: number;
  completed_at: string | null;
}

export interface StudentMissionsResponse {
  pending: StudentMissionItem[];
  completed: StudentMissionItem[];
}

export const missionsService = {
  create: async (data: {
    paralelo_id: string;
    tipo: 'PLAY_TIME' | 'PLAY_DISTINCT' | 'ANSWER_CORRECT';
    goal_value: number;
    fecha_limite: string;
    descripcion?: string;
    xp_reward?: number;
  }): Promise<unknown> => {
    const res = await api.post('/missions', data);
    return res.data;
  },

  getMyMissions: async (): Promise<StudentMissionsResponse> => {
    const res = await api.get<StudentMissionsResponse>('/missions/my');
    return res.data;
  },

  listForTeacher: async (paraleloId?: string): Promise<Mission[]> => {
    const res = await api.get<Mission[]>('/missions', {
      params: paraleloId ? { paralelo_id: paraleloId } : {},
    });
    return res.data;
  },

  getProgressDetail: async (missionId: string): Promise<MissionProgressDetail> => {
    const res = await api.get<MissionProgressDetail>(`/missions/${missionId}/progress`);
    return res.data;
  },

  remove: async (missionId: string): Promise<unknown> => {
    const res = await api.delete(`/missions/${missionId}`);
    return res.data;
  },
};
