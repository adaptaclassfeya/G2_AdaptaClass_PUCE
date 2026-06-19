import api from '../../../services/api';
import type { TeacherGame, TeacherGameSummary } from '../types/game.types';

interface BackendGame {
  id: string;
  titulo: string;
  descripcion: string | null;
  tema: string;
  tipo: 'BASE' | 'CAMBIANTE';
  acepta_preguntas_ia: boolean;
  thumbnail_url?: string | null;
  config_default?: { rutaJuego?: string } | null;
  questionsCount?: number;
}

interface TeacherGamesResponse {
  games?: BackendGame[];
  data?: BackendGame[];
  summary?: TeacherGameSummary;
}

const temaLabels: Record<string, string> = {
  LENGUA_CULTURA: 'Lengua y Cultura',
  COMUNICACION_ORAL: 'Comunicacion Oral',
  LECTURA: 'Lectura',
  ESCRITURA: 'Escritura',
  LITERATURA: 'Literatura',
};

function mapBackendGame(game: BackendGame): TeacherGame {
  const baseRoute = game.config_default?.rutaJuego ?? '/games/bomb-game';
  return {
    id: game.id,
    title: game.titulo,
    description: game.descripcion ?? 'Juego educativo disponible.',
    category: temaLabels[game.tema] ?? game.tema.replaceAll('_', ' '),
    imageUrl: game.thumbnail_url ?? undefined,
    route: `${baseRoute}?gameId=${game.id}`,
    questionsCount: game.questionsCount ?? 0,
    status: game.tipo === 'CAMBIANTE' ? 'published' : 'draft',
    aceitaIA: game.acepta_preguntas_ia,
  };
}

function normalizeGamesResponse(response: TeacherGamesResponse | BackendGame[]) {
  if (Array.isArray(response)) {
    return response.map(mapBackendGame);
  }

  return (response.games ?? response.data ?? []).map(mapBackendGame);
}

export const gamesService = {
  async getTeacherGames() {
    const response = await api.get<TeacherGamesResponse | BackendGame[]>('/games');
    return normalizeGamesResponse(response.data);
  },
};
