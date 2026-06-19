import api from '../../../services/api';

// Notifications used to point at game-specific assignments. After the
// missions rework they point at a Mission instead — same shape as what
// the backend returns from /notifications/pending (include: { mission: true }).
export type NotificationMissionType =
  | 'PLAY_TIME'
  | 'PLAY_DISTINCT'
  | 'ANSWER_CORRECT';

export interface NotificationMission {
  id: string;
  paralelo_id: string;
  tipo: NotificationMissionType;
  goal_value: number;
  fecha_limite: string;
  created_by: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  student_id: string;
  mission_id: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
  mission?: NotificationMission | null;
}

export const notificationsService = {
  getPending: () => api.get<NotificationRow[]>('/notifications/pending'),
  markAsRead: (id: string) => api.patch<NotificationRow>(`/notifications/${id}/read`),
};
