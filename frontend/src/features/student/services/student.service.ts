import api from '../../../services/api';
import type { AuthUser } from '../../../types/auth';
import type { StudentGame, StudentProfile } from '../types/student.types';

interface BackendGame {
  id: string;
  titulo: string;
  descripcion: string | null;
  tema: string;
  tipo: 'BASE' | 'CAMBIANTE';
  thumbnail_url?: string | null;
  config_default?: { rutaJuego?: string } | null;
  // Server now adds this to every /games row — total questions in the
  // teacher's bank that will be served to this student in any game.
  questionsCount?: number;
}

const temaLabels: Record<string, string> = {
  LENGUA_CULTURA: 'Lengua y Cultura',
  COMUNICACION_ORAL: 'Comunicación Oral',
  LECTURA: 'Lectura',
  ESCRITURA: 'Escritura',
  LITERATURA: 'Literatura',
};

function getGameRoute(game: BackendGame, params?: Record<string, string>) {
  const base = game.config_default?.rutaJuego ?? '/games/bomb-game';
  const search = new URLSearchParams(params);
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

function mapTemaToLabel(tema: string) {
  return temaLabels[tema] ?? tema.replaceAll('_', ' ');
}

function mapBackendGame(game: BackendGame): StudentGame {
  return {
    id: game.id,
    title: game.titulo,
    description: game.descripcion ?? 'Juego educativo disponible.',
    categoryCode: game.tema,
    category: mapTemaToLabel(game.tema),
    tipo: game.tipo,
    imageUrl: game.thumbnail_url ?? undefined,
    route: getGameRoute(game, { gameId: game.id }),
    locked: false,
    questionsCount: game.questionsCount ?? 0,
  };
}

// 1000 XP per level keeps the dashboard's `xpProgress = (xp % 1000) / 10`
// calculation consistent with the level number we expose.
const XP_PER_LEVEL = 1000;

function buildLevelTitle(nivel: number): string {
  if (nivel >= 10) return 'Maestro de Lengua';
  if (nivel >= 5) return 'Lector avanzado';
  if (nivel >= 2) return 'Explorador en progreso';
  return 'Aprendiz';
}

export function buildStudentProfile(user: AuthUser | null | undefined): StudentProfile {
  const xp = user?.puntos_xp ?? 0;
  const racha = user?.racha_dias ?? 0;
  const nivel = Math.floor(xp / XP_PER_LEVEL) + 1;

  return {
    xp,
    racha,
    nivel,
    titulo: buildLevelTitle(nivel),
    paralelo: user?.paralelo_id
      ? {
          id: user.paralelo_id,
          nombre: 'Paralelo asignado',
          grado: 0,
        }
      : null,
  };
}

export const studentGamesService = {
  async getAvailableGames(): Promise<StudentGame[]> {
    const response = await api.get<BackendGame[]>('/games');
    return response.data.map(mapBackendGame);
  },
};

