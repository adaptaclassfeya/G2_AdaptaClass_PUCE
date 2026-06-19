import { useCallback, useEffect, useState } from 'react';
import {
  paralelosService,
  type RankingEntry,
} from '../../paralelos/services/paralelos.service';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface LeaderboardProps {
  /** Paralelo whose ranking we render. */
  paraleloId: string;
  /** Used to highlight the row belonging to the logged-in student. */
  currentUserId?: string;
}

// Medal styling for the top 3 ranks. Explicit color utilities (yellow/gray/
// amber) are used the same way the dashboard uses `text-orange-500` for the
// streak flame — an intentional escape hatch from the design tokens for
// semantic "gold/silver/bronze" colors.
const MEDALS: Record<number, { badge: string; icon: string }> = {
  1: { badge: 'bg-yellow-400 text-on-background', icon: 'emoji_events' },
  2: { badge: 'bg-gray-300 text-on-background', icon: 'workspace_premium' },
  3: { badge: 'bg-amber-600 text-white', icon: 'workspace_premium' },
};

export function Leaderboard({ paraleloId, currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setError('');
    setIsLoading(true);
    paralelosService
      .ranking(paraleloId)
      .then((response) => setEntries(response.data))
      .catch((requestError: unknown) => {
        setEntries([]);
        setError(getApiErrorMessage(requestError, 'No pudimos cargar la clasificación.'));
      })
      .finally(() => setIsLoading(false));
  }, [paraleloId]);

  useEffect(() => {
    // Defer to a macrotask so the synchronous setState calls inside `load`
    // don't trigger the cascading-render lint rule (same pattern as the
    // student dashboard's data loaders).
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]">
      <div className="mb-md flex items-center gap-sm border-b-2 border-on-background pb-sm">
        <span
          className="material-symbols-outlined text-2xl text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          leaderboard
        </span>
        <h2 className="font-headline text-2xl font-bold uppercase md:text-4xl">Clasificación</h2>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-sm border-4 border-dashed border-on-background bg-surface-container-low p-lg text-center">
          <span className="material-symbols-outlined animate-spin text-[40px] text-outline">
            progress_activity
          </span>
          <p className="font-mono text-sm uppercase text-on-surface-variant">
            Cargando clasificación…
          </p>
        </div>
      ) : error ? (
        <div className="border-2 border-on-background bg-error-container p-md text-on-error-container">
          <p className="font-bold">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-sm border-2 border-on-background bg-surface px-sm py-xs font-headline text-sm font-bold uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17]"
          >
            Reintentar
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center gap-sm border-4 border-dashed border-on-background bg-surface-container-low p-lg text-center">
          <span className="material-symbols-outlined text-[48px] text-outline">groups</span>
          <p className="font-mono text-sm uppercase text-on-surface-variant">
            Todavía no hay estudiantes en este paralelo.
          </p>
        </div>
      ) : (
        <ol className="space-y-sm">
          {entries.map((entry) => {
            const isCurrentUser = entry.user_id === currentUserId;
            const medal = MEDALS[entry.rank];
            return (
              <li
                key={entry.user_id}
                className={[
                  'flex items-center gap-sm border-2 border-on-background p-sm shadow-[4px_4px_0_0_#1d1c17]',
                  isCurrentUser ? 'bg-primary-container' : 'bg-surface-container-lowest',
                ].join(' ')}
              >
                {/* Rank badge (medal color for top 3) */}
                <div
                  className={[
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-on-background font-headline text-lg font-bold shadow-[2px_2px_0_0_#1d1c17]',
                    medal ? medal.badge : 'bg-surface-container-high text-on-surface',
                  ].join(' ')}
                >
                  {medal ? (
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {medal.icon}
                    </span>
                  ) : (
                    entry.rank
                  )}
                </div>

                {/* Avatar initial */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-2 border-on-background bg-primary font-headline text-base font-bold text-on-primary">
                  {entry.nombre.slice(0, 1).toUpperCase()}
                </div>

                {/* Name + (TÚ) marker */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm font-bold uppercase">
                    {entry.nombre}
                  </p>
                  {isCurrentUser && (
                    <span className="font-mono text-[10px] font-bold uppercase text-primary">
                      Tú
                    </span>
                  )}
                </div>

                {/* Streak */}
                <div className="hidden items-center gap-xs sm:flex">
                  <span className="material-symbols-outlined text-base text-orange-500">
                    local_fire_department
                  </span>
                  <span className="font-mono text-sm font-bold text-orange-500">
                    {entry.racha_dias}
                  </span>
                </div>

                {/* XP */}
                <div className="flex flex-shrink-0 items-baseline gap-xs">
                  <span className="font-headline text-lg font-bold text-primary">
                    {entry.puntos_xp}
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase text-on-surface-variant">
                    XP
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
