import api from '../../../services/api';

export interface AchievementItem {
  codigo: string;
  nombre: string;
  descripcion: string;
  /** Material Symbol name shown on the badge when unlocked. */
  icon: string;
  xp_reward: number;
  earned: boolean;
  earned_at: string | null;
}

export const achievementsService = {
  // Returns the full catalog annotated with the student's unlock status.
  // The backend re-evaluates achievements on each call, so this is the
  // source of truth for the trophy room.
  getMyAchievements: async (): Promise<AchievementItem[]> => {
    const res = await api.get<AchievementItem[]>('/achievements/my');
    return res.data;
  },
};
