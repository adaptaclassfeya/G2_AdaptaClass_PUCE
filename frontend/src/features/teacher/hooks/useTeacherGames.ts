import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { gamesService } from '../../games/services/games.service';
import type { TeacherGame } from '../../games/types/game.types';

export function useTeacherGames() {
  const [games, setGames] = useState<TeacherGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadGames() {
      setIsLoading(true);
      setError(null);

      try {
        const all = await gamesService.getTeacherGames();

        // Filter to games that accept AI questions, deduplicate by title then by id
        // (DB may have duplicate rows if seed ran before UNIQUE constraint was applied)
        const seenTitles = new Set<string>();
        const unique = all.filter(g => {
          if (!g.aceitaIA) return false;
          const key = g.title.toLowerCase().trim();
          if (seenTitles.has(key)) return false;
          seenTitles.add(key);
          return true;
        });

        if (mounted) {
          setGames(unique);
        }
      } catch (error: unknown) {
        if (mounted) {
          setError(getApiErrorMessage(error, 'No se pudieron cargar los juegos'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadGames();

    return () => {
      mounted = false;
    };
  }, []);

  return { games, isLoading, error };
}
