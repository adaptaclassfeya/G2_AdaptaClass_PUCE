import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routePaths } from '../../../app/router/routePaths';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { StudentShell } from '../components/StudentShell';
import { studentGamesService } from '../services/student.service';
import type { StudentGame } from '../types/student.types';

export function StudentGameCatalogPage() {
  const [games, setGames] = useState<StudentGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadGames = () => {
    setLoading(true);
    setError('');
    studentGamesService
      .getAvailableGames()
      .then((data) => setGames(data))
      .catch((requestError: unknown) => {
        setError(getApiErrorMessage(requestError, 'No pudimos cargar los juegos.'));
        setGames([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(loadGames, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // Every game now draws from the same teacher bank, so the count is
  // identical across cards. Read it off the first game (defensive default
  // of 0 when the catalog is empty or the student isn't in a paralelo).
  const bankSize = games[0]?.questionsCount ?? 0;

  if (loading) {
    return (
      <StudentShell title="Catálogo de Juegos">
        <div className="flex h-64 items-center justify-center">
          <p className="font-headline text-xl text-on-surface-variant">Cargando juegos...</p>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="Catálogo de Juegos">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-2xl font-bold uppercase md:text-4xl">
          Juegos disponibles
        </h2>
        <p className="mt-xs text-sm text-on-surface-variant md:text-base">
          Explora todos los juegos educativos. Cada uno usa las preguntas que tu profesor cargó en
          el banco — las mismas para todos los juegos.
        </p>
      </section>

      {error && (
        <div className="mb-lg border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          <p className="font-bold">{error}</p>
          <button
            type="button"
            onClick={loadGames}
            className="mt-sm border-2 border-on-background bg-surface px-sm py-xs font-headline text-sm font-bold uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17]"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && games.length > 0 && bankSize === 0 && (
        <div className="mb-lg border-4 border-on-background bg-surface-container-low p-md shadow-[4px_4px_0_0_#1d1c17] md:shadow-[6px_6px_0_0_#1d1c17]">
          <div className="flex items-start gap-sm">
            <span className="material-symbols-outlined text-primary">info</span>
            <div>
              <h3 className="font-headline text-base font-bold uppercase md:text-lg">
                Aún no hay preguntas en tu paralelo
              </h3>
              <p className="text-sm text-on-surface-variant">
                Tu profesor todavía no ha subido preguntas al banco. Puedes jugar igual con las
                preguntas de práctica que trae cada juego.
              </p>
            </div>
          </div>
        </div>
      )}

      {!error && games.length > 0 && (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to={routePaths.studentAdaptaGJoin}
            className="group flex flex-col border-4 border-on-background bg-surface-container-lowest shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17] md:hover:shadow-[4px_4px_0_0_#1d1c17]"
          >
            <div className="relative h-44 overflow-hidden border-b-4 border-on-background bg-[#1368ce]">
              <div className="flex h-full w-full items-center justify-center">
                <span className="material-symbols-outlined text-[64px] text-white">
                  group
                </span>
              </div>
              <span className="absolute right-sm top-sm border-2 border-on-background bg-primary px-sm py-xs font-mono text-xs font-bold uppercase text-on-primary">
                En Vivo
              </span>
            </div>
            <div className="flex flex-1 flex-col p-md">
              <h4 className="mb-xs font-headline text-xl font-bold">Adapta - G (Multijugador)</h4>
              <p className="flex-1 text-sm text-on-surface-variant">Únete a una partida en vivo con tu profesor y compite con tus compañeros.</p>
              <div className="mt-md flex items-center justify-end">
                <span className="flex items-center gap-xs font-mono text-sm font-bold text-primary">
                  <span className="material-symbols-outlined text-base">login</span>
                  Unirse con PIN
                </span>
              </div>
            </div>
          </Link>
          {games.map((game) => (
            <Link
              key={game.id}
              to={game.route}
              className="group flex flex-col border-4 border-on-background bg-surface-container-lowest shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17] md:hover:shadow-[4px_4px_0_0_#1d1c17]"
            >
              <div className="relative h-44 overflow-hidden border-b-4 border-on-background bg-primary-fixed">
                {game.imageUrl ? (
                  <img
                    src={game.imageUrl}
                    alt={game.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="material-symbols-outlined text-[64px] text-primary">
                      stadia_controller
                    </span>
                  </div>
                )}
                <span
                  className={[
                    'absolute right-sm top-sm border-2 border-on-background px-sm py-xs font-mono text-xs font-bold uppercase',
                    game.tipo === 'CAMBIANTE'
                      ? 'bg-tertiary text-on-tertiary'
                      : 'bg-secondary text-on-secondary',
                  ].join(' ')}
                >
                  {game.tipo === 'CAMBIANTE' ? 'Personalizado' : 'Libre'}
                </span>
                <span className="absolute left-sm top-sm flex items-center gap-xs border-2 border-on-background bg-surface-container-lowest px-sm py-xs font-mono text-xs font-bold uppercase text-on-surface">
                  <span className="material-symbols-outlined text-sm text-primary">quiz</span>
                  {game.questionsCount} {game.questionsCount === 1 ? 'pregunta' : 'preguntas'}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-md">
                <h4 className="mb-xs font-headline text-xl font-bold">{game.title}</h4>
                <p className="flex-1 text-sm text-on-surface-variant">{game.description}</p>
                <div className="mt-md flex items-center justify-end">
                  <span className="flex items-center gap-xs font-mono text-sm font-bold text-primary">
                    <span className="material-symbols-outlined text-base">play_arrow</span>
                    Jugar
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!error && games.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-md border-4 border-dashed border-on-background bg-surface-container-lowest p-xl text-center">
          <span className="material-symbols-outlined text-[64px] text-outline">
            stadia_controller
          </span>
          <h3 className="font-headline text-2xl font-bold uppercase">Sin juegos disponibles</h3>
          <p className="text-on-surface-variant">
            Tu profesor aún no ha habilitado juegos para tu paralelo.
          </p>
          <Link
            to={routePaths.studentDashboard}
            className="border-2 border-on-background bg-primary px-md py-sm font-headline text-sm font-bold uppercase text-on-primary shadow-[2px_2px_0_0_#1d1c17]"
          >
            Volver al inicio
          </Link>
        </div>
      )}
    </StudentShell>
  );
}
