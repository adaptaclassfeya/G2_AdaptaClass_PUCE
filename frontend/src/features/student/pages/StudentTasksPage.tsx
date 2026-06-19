import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { StudentShell } from '../components/StudentShell';
import { missionsService } from '../../missions/services/missions.service';
import type { StudentMissionItem } from '../../missions/services/missions.service';
import { routePaths } from '../../../app/router/routePaths';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function StudentTasksPage() {
  const [pending, setPending] = useState<StudentMissionItem[]>([]);
  const [completed, setCompleted] = useState<StudentMissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMissions = useCallback(() => {
    setLoading(true);
    setError('');
    missionsService
      .getMyMissions()
      .then((data) => {
        setPending(data.pending);
        setCompleted(data.completed);
      })
      .catch((requestError: unknown) => {
        setPending([]);
        setCompleted([]);
        setError(getApiErrorMessage(requestError, 'No pudimos cargar tus misiones.'));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadMissions, 0);
    return () => window.clearTimeout(timer);
  }, [loadMissions]);

  const getTipoLabel = (tipo: string) => {
    if (tipo === 'PLAY_TIME') return 'Tiempo de Juego';
    if (tipo === 'PLAY_DISTINCT') return 'Variedad de Juegos';
    if (tipo === 'ANSWER_CORRECT') return 'Preguntas Correctas';
    return tipo;
  };

  const getGoalDescription = (tipo: string, current: number, goal: number) => {
    if (tipo === 'PLAY_TIME') {
      return `Llevas ${current} de ${goal} minutos jugados en total.`;
    }
    if (tipo === 'PLAY_DISTINCT') {
      return `Has jugado ${current} de ${goal} juegos diferentes de la plataforma.`;
    }
    if (tipo === 'ANSWER_CORRECT') {
      return `Has respondido ${current} de ${goal} preguntas correctamente.`;
    }
    return `Progreso: ${current}/${goal}`;
  };

  const getMissionTitle = (tipo: string, goal: number) => {
    if (tipo === 'PLAY_TIME') return `Jugar ${goal} minutos`;
    if (tipo === 'PLAY_DISTINCT') return `Jugar ${goal} juegos diferentes`;
    if (tipo === 'ANSWER_CORRECT') return `Responder ${goal} preguntas correctamente`;
    return `Misión de objetivo ${goal}`;
  };

  if (loading) {
    return (
      <StudentShell title="Mis Misiones">
        <div className="flex h-64 items-center justify-center">
          <p className="font-headline text-xl text-on-surface-variant">Cargando misiones...</p>
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="Mis Misiones">
      <section className="mb-lg border-b-4 border-on-background pb-md">
        <h2 className="font-headline text-2xl font-bold uppercase md:text-4xl">Mis Misiones</h2>
        <p className="mt-xs text-sm text-on-surface-variant md:text-base">
          Aquí aparecen las misiones y objetivos que tu profesor ha asignado a tu clase. ¡Cumple misiones para ganar mucha XP!
        </p>
      </section>

      {error && (
        <div className="mb-lg border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          <p className="font-bold">{error}</p>
          <button
            type="button"
            onClick={loadMissions}
            className="mt-sm border-2 border-on-background bg-surface px-sm py-xs font-headline text-sm font-bold uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17]"
          >
            Reintentar
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="mb-xl">
            <h3 className="mb-md font-headline text-xl font-bold uppercase md:text-2xl">
              Misiones Activas
            </h3>
            {pending.length === 0 ? (
              <div className="flex flex-col items-center gap-sm border-4 border-dashed border-on-background bg-surface-container-lowest p-lg text-center">
                <span className="material-symbols-outlined text-[48px] text-outline">
                  task_alt
                </span>
                <p className="font-mono text-sm uppercase text-on-surface-variant">
                  ¡Estás al día! No tienes misiones activas.
                </p>
              </div>
            ) : (
              <div className="space-y-md">
                {pending.map((task) => {
                  const progress = Math.min((task.current_value / task.goal_value) * 100, 100);
                  return (
                    <div
                      key={task.id}
                      className="border-4 border-on-background bg-surface-container-lowest p-sm shadow-[4px_4px_0_0_#1d1c17] md:p-md md:shadow-[8px_8px_0_0_#1d1c17]"
                    >
                      <div className="flex flex-col gap-sm md:flex-row md:items-start md:justify-between">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-sm">
                            <span className="border-2 border-on-background bg-secondary px-sm py-xs font-mono text-xs font-bold uppercase text-on-secondary">
                              {getTipoLabel(task.tipo)}
                            </span>
                            <span className="border-2 border-on-background bg-tertiary px-sm py-xs font-mono text-xs font-bold uppercase text-on-tertiary">
                              +{task.xp_reward} XP
                            </span>
                            <span className="border-2 border-yellow-600 bg-yellow-100 px-sm py-xs font-mono text-xs font-bold uppercase text-yellow-800">
                              En progreso
                            </span>
                          </div>
                          <h4 className="mt-sm font-headline text-lg font-bold md:text-xl text-primary">
                            {getMissionTitle(task.tipo, task.goal_value)}
                          </h4>
                          {task.descripcion && (
                            <p className="mt-xs text-sm italic text-on-surface">
                              “{task.descripcion}”
                            </p>
                          )}
                          <p className="mt-xs text-sm text-on-surface-variant">
                            Objetivo: <strong>{getGoalDescription(task.tipo, task.current_value, task.goal_value)}</strong> <br />
                            Vence el {formatDate(task.fecha_limite)}
                          </p>
                        </div>
                        <Link
                          to={routePaths.studentGames}
                          className="flex items-center justify-center gap-xs border-4 border-on-background bg-primary px-lg py-sm font-headline font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] md:shadow-[6px_6px_0_0_#1d1c17]"
                        >
                          <span className="material-symbols-outlined">play_arrow</span>
                          ¡Jugar!
                        </Link>
                      </div>

                      <div className="mt-md">
                        <div className="mb-xs flex justify-between text-sm font-bold">
                          <span>Progreso de la Misión</span>
                          <span>
                            {task.current_value}/{task.goal_value}
                          </span>
                        </div>
                        <div className="h-4 w-full overflow-hidden border-2 border-on-background bg-surface-variant">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-md font-headline text-xl font-bold uppercase md:text-2xl">
              Misiones Cumplidas
            </h3>
            {completed.length === 0 ? (
              <p className="text-on-surface-variant">Aún no has completado ninguna misión en esta clase.</p>
            ) : (
              <div className="space-y-sm">
                {completed.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border-2 border-on-background bg-surface-container p-sm shadow-[4px_4px_0_0_#1d1c17]"
                  >
                    <div className="flex items-center gap-sm">
                      <div className="border border-on-background bg-primary-container p-xs">
                        <span className="material-symbols-outlined text-on-primary-container">
                          check_circle
                        </span>
                      </div>
                      <div>
                        <p className="font-mono text-sm font-bold uppercase text-primary">
                          {getMissionTitle(task.tipo, task.goal_value)}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          Completada el{' '}
                          {task.completed_at ? formatDate(task.completed_at) : '-'}
                        </p>
                      </div>
                    </div>
                    {task.xp_ganado !== undefined && (
                      <p className="font-headline text-lg font-bold text-primary">
                        +{task.xp_ganado} XP
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </StudentShell>
  );
}
