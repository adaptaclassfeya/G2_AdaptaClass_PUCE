import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { useAuthStore } from '../../auth/store/authStore';
import { routePaths } from '../../../app/router/routePaths';
import api from '../../../services/api';

interface GameSessionDetail {
  id: string;
  minutos_jugados: string | number;
  preguntas_correctas: number;
  preguntas_intentadas: number;
  game: {
    id: string;
    titulo: string;
    descripcion: string | null;
    tema: string;
  };
}

/**
 * Shown after the student completes a game session. Looks up the session
 * in /game-sessions/:id to show statistics, and re-hydrates the auth user
 * so the header shows the new totals.
 */
export function StudentResultPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const hydrate = useAuthStore((state) => state.hydrate);
  const { user } = useAuthStore();
  const [session, setSession] = useState<GameSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Snapshot XP before /auth/me refresh so we can render the delta cleanly
  const previousXp = useMemo(() => user?.puntos_xp ?? 0, [user?.puntos_xp]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Re-pull /auth/me to refresh XP + racha in the global store. The
        // header in StudentShell reads from the store so it updates live.
        await hydrate();
      } catch {
        // If hydrate fails the result screen still works — just no XP delta.
      }
      if (sessionId) {
        try {
          const res = await api.get<GameSessionDetail>(`/game-sessions/${sessionId}`);
          if (mounted) {
            setSession(res.data);
          }
        } catch (error) {
          console.error('Failed to load session details', error);
        } finally {
          if (mounted) setLoading(false);
        }
      } else {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionId, hydrate]);

  // Missing sessionId in the URL means the page was opened directly or after
  // a quit-before-play — there's nothing to show, send them back to pick a
  // game. The same applies to an empty session (zero minutes AND zero
  // attempts), which used to render a depressing all-zero result screen.
  if (!loading && !sessionId) {
    return <Navigate to={routePaths.studentGames} replace />;
  }
  if (
    !loading &&
    session &&
    Number(session.minutos_jugados) === 0 &&
    session.preguntas_intentadas === 0
  ) {
    return <Navigate to={routePaths.studentGames} replace />;
  }

  if (loading) {
    return (
      <StudentShell title="¡Buen trabajo!">
        <div className="flex h-64 items-center justify-center">
          <p className="font-headline text-xl text-on-surface-variant">Cargando resultado...</p>
        </div>
      </StudentShell>
    );
  }

  const currentXp = user?.puntos_xp ?? previousXp;
  const xpEarned = Math.max(0, currentXp - previousXp);

  return (
    <StudentShell title="¡Buen trabajo!">
      <section className="mx-auto w-full max-w-[560px] border-4 border-on-background bg-surface-container-lowest p-md text-center shadow-[6px_6px_0_0_#1d1c17] md:p-lg md:shadow-[8px_8px_0_0_#1d1c17]">
        <span
          className="material-symbols-outlined text-[72px] text-primary md:text-[96px]"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          emoji_events
        </span>
        <h2 className="mt-sm break-words font-headline text-2xl font-bold uppercase leading-tight md:mt-md md:text-4xl">
          {xpEarned > 0 ? '¡Misión completada!' : '¡Buen intento!'}
        </h2>
        {session && (
          <p className="mt-sm text-base text-on-surface-variant md:text-lg">
            Jugaste a: <strong>{session.game.titulo}</strong>
          </p>
        )}

        <div className="mt-md grid grid-cols-2 gap-sm md:mt-lg md:gap-md">
          <div className="border-4 border-on-background bg-primary-container p-sm text-on-primary-container md:p-md">
            <p className="font-mono text-xs uppercase">XP ganado</p>
            <p className="mt-xs font-headline text-2xl font-bold md:text-4xl">+{xpEarned}</p>
          </div>
          <div className="border-4 border-on-background bg-secondary-container p-sm text-on-secondary-container md:p-md">
            <p className="font-mono text-xs uppercase">XP total</p>
            <p className="mt-xs font-headline text-2xl font-bold md:text-4xl">{currentXp}</p>
          </div>
        </div>

        {session && (
          <div className="mt-md border-2 border-on-background bg-surface-container p-sm text-left md:mt-lg md:p-md">
            <h3 className="mb-sm font-headline text-base font-bold uppercase text-primary md:text-lg">
              Estadísticas de la partida
            </h3>
            <ul className="space-y-xs font-mono text-xs md:text-sm">
              <li>
                ⏱️ Tiempo: <strong>{Number(session.minutos_jugados).toFixed(1)}</strong> minutos
              </li>
              <li>
                🎯 Respuestas correctas: <strong>{session.preguntas_correctas}</strong>
              </li>
              <li>
                📝 Preguntas intentadas: <strong>{session.preguntas_intentadas}</strong>
              </li>
            </ul>
          </div>
        )}

        <div className="mt-md flex flex-col items-stretch justify-center gap-sm md:mt-lg md:flex-row">
          <Link
            to={routePaths.studentTasks}
            className="border-4 border-on-background bg-primary px-lg py-md font-headline text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
          >
            Ver mis misiones
          </Link>
          <Link
            to={routePaths.studentGames}
            className="border-4 border-on-background bg-surface px-lg py-md font-headline text-base font-bold uppercase shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17]"
          >
            Otro juego
          </Link>
        </div>
      </section>
    </StudentShell>
  );
}
