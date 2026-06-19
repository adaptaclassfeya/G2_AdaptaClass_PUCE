import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StudentShell } from '../components/StudentShell';
import { JoinParaleloCard } from '../components/JoinParaleloCard';
import { MyParaleloCard } from '../components/MyParaleloCard';
import { useAuthStore } from '../../auth/store/authStore';
import {
  buildStudentProfile,
  studentGamesService,
} from '../services/student.service';
import { missionsService } from '../../missions/services/missions.service';
import type { StudentMissionItem } from '../../missions/services/missions.service';
import { routePaths } from '../../../app/router/routePaths';
import type { StudentGame } from '../types/student.types';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import {
  achievementsService,
  type AchievementItem,
} from '../../achievements/services/achievements.service';

function getMissionTitle(tipo: string, goal: number) {
  if (tipo === 'PLAY_TIME') return `Jugar ${goal} minutos`;
  if (tipo === 'PLAY_DISTINCT') return `Jugar ${goal} juegos diferentes`;
  if (tipo === 'ANSWER_CORRECT') return `Responder ${goal} preguntas correctamente`;
  return `Misión de objetivo ${goal}`;
}

function formatRelative(iso: string | undefined | null): string {
  if (!iso) return '';
  const completedAt = new Date(iso);
  const diffMs = Date.now() - completedAt.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Hace minutos';
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

export function StudentDashboardPage() {
  const { user } = useAuthStore();
  const streakBonusXp = useAuthStore((state) => state.streakBonusXp);
  const clearStreakBonus = useAuthStore((state) => state.clearStreakBonus);
  const profile = buildStudentProfile(user);
  const [games, setGames] = useState<StudentGame[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<StudentMissionItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [gamesError, setGamesError] = useState('');
  const [assignmentsError, setAssignmentsError] = useState('');
  const [achievementsError, setAchievementsError] = useState('');
  const firstName = user?.nombre?.split(' ')[0] ?? 'Estudiante';
  const xpProgress = (profile.xp % 1000) / 10;
  const xpToNext = 1000 - (profile.xp % 1000);

  const loadGames = useCallback(() => {
    setGamesError('');
    studentGamesService
      .getAvailableGames()
      .then(setGames)
      .catch((requestError: unknown) => {
        setGames([]);
        setGamesError(getApiErrorMessage(requestError, 'No pudimos cargar tus juegos.'));
      });
  }, []);

  const loadRecentAssignments = useCallback(() => {
    if (!user?.paralelo_id) return;
    setAssignmentsError('');
    missionsService
      .getMyMissions()
      .then((data) => setRecentCompleted(data.completed.slice(0, 3)))
      .catch((requestError: unknown) => {
        setRecentCompleted([]);
        setAssignmentsError(
          getApiErrorMessage(requestError, 'No pudimos cargar tu actividad reciente.'),
        );
      });
  }, [user?.paralelo_id]);

  const loadAchievements = useCallback(() => {
    setAchievementsError('');
    achievementsService
      .getMyAchievements()
      .then(setAchievements)
      .catch((requestError: unknown) => {
        setAchievements([]);
        setAchievementsError(
          getApiErrorMessage(requestError, 'No pudimos cargar tus logros.'),
        );
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadGames, 0);
    return () => window.clearTimeout(timer);
  }, [loadGames]);

  useEffect(() => {
    // Only students with a paralelo can have assignments.
    const timer = window.setTimeout(loadRecentAssignments, 0);
    return () => window.clearTimeout(timer);
  }, [loadRecentAssignments]);

  useEffect(() => {
    const timer = window.setTimeout(loadAchievements, 0);
    return () => window.clearTimeout(timer);
  }, [loadAchievements]);

  return (
    <StudentShell title="Mi Panel">
      {streakBonusXp > 0 && (
        <div className="mb-md flex items-center justify-between gap-sm border-4 border-on-background bg-tertiary p-sm text-on-tertiary shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
          <div className="flex items-center gap-sm">
            <span
              className="material-symbols-outlined text-2xl text-orange-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <div>
              <p className="font-headline text-base font-bold uppercase">
                ¡Bono de racha! +{streakBonusXp} XP
              </p>
              <p className="font-mono text-xs uppercase">
                Llevas {profile.racha} {profile.racha === 1 ? 'día' : 'días'} seguidos jugando.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearStreakBonus}
            className="border-2 border-on-background bg-surface-container-lowest px-sm py-xs font-mono text-xs font-bold uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17]"
          >
            ¡Vamos!
          </button>
        </div>
      )}

      {user?.paralelo_id ? <MyParaleloCard /> : <JoinParaleloCard />}

      <section className="mb-lg grid grid-cols-1 items-stretch gap-md md:gap-lg md:grid-cols-3">
        <div className="md:col-span-2 flex flex-col gap-md border-4 border-on-background bg-surface-container p-md md:p-lg shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17] md:flex-row md:items-center">
          <div className="relative flex-shrink-0">
            <div className="flex h-20 w-20 md:h-32 md:w-32 items-center justify-center border-4 border-on-background bg-primary shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
              <span className="font-headline text-3xl md:text-5xl font-bold text-on-primary">
                {firstName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="absolute -bottom-4 -right-4 border-2 border-on-background bg-tertiary px-sm py-xs font-headline text-sm font-bold text-on-tertiary shadow-[4px_4px_0_0_#1d1c17]">
              LVL {profile.nivel}
            </div>
          </div>

          <div className="flex-1">
            <div className="mb-xs flex items-end justify-between">
              <div>
                <p className="font-mono text-xs uppercase text-on-surface-variant">
                  {profile.titulo}
                </p>
                <h2 className="font-headline text-xl md:text-3xl font-bold uppercase">
                  Hola, {firstName}!
                </h2>
              </div>
              <p className="font-mono text-sm font-bold text-on-surface-variant">
                {profile.xp} / {profile.xp + xpToNext} XP
              </p>
            </div>
            <div className="h-6 w-full overflow-hidden border-4 border-on-background bg-surface-container-lowest p-1">
              <div
                className="h-full border-r-4 border-on-background bg-primary transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="mt-xs text-sm italic text-on-surface-variant">
              Te faltan {xpToNext} XP para alcanzar el nivel {profile.nivel + 1}. Sigue jugando.
            </p>
            {profile.paralelo && (
              <div className="mt-sm flex w-fit items-center gap-xs border-2 border-on-background bg-surface-container-lowest px-sm py-xs">
                <span className="material-symbols-outlined text-sm text-primary">school</span>
                <span className="font-mono text-xs font-bold uppercase">
                  {profile.paralelo.nombre}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md md:gap-lg md:grid-cols-1">
          <div className="flex flex-col items-center justify-center border-4 border-on-background bg-secondary-container p-sm md:p-md text-center shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
            <span
              className="material-symbols-outlined mb-xs text-4xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              star
            </span>
            <h4 className="font-headline text-2xl md:text-4xl font-bold">{games.length}</h4>
            <p className="font-mono text-xs uppercase text-on-surface-variant">Juegos</p>
          </div>
          <div className="flex flex-col items-center justify-center border-4 border-on-background bg-tertiary-fixed p-sm md:p-md text-center shadow-[4px_4px_0_0_#1d1c17] md:shadow-[8px_8px_0_0_#1d1c17]">
            <span
              className="material-symbols-outlined mb-xs text-4xl text-orange-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              local_fire_department
            </span>
            <h4 className="font-headline text-2xl md:text-4xl font-bold">{profile.racha}</h4>
            <p className="font-mono text-xs uppercase text-on-surface-variant">Racha días</p>
          </div>
        </div>
      </section>

      <section className="mb-lg grid grid-cols-1 gap-lg lg:grid-cols-12">
        <div className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17] lg:col-span-7">
          <div className="mb-md flex items-center justify-between border-b-2 border-on-background pb-sm">
            <h3 className="font-headline text-xl font-bold uppercase">Sala de Trofeos</h3>
            <span className="font-mono text-xs uppercase text-on-surface-variant">
              {achievements.length > 0
                ? `${achievements.filter((a) => a.earned).length}/${achievements.length}`
                : ''}
            </span>
          </div>
          {achievementsError ? (
            <div className="border-2 border-on-background bg-error-container p-sm text-on-error-container">
              <p className="text-sm font-bold">{achievementsError}</p>
              <button
                type="button"
                onClick={loadAchievements}
                className="mt-xs font-mono text-xs font-bold uppercase text-primary hover:underline"
              >
                Reintentar
              </button>
            </div>
          ) : achievements.length === 0 ? (
            <p className="font-mono text-xs uppercase text-on-surface-variant">
              Aún no hay logros disponibles.
            </p>
          ) : (
            <div className="flex flex-wrap gap-md">
              {achievements.map((badge) => (
                <div
                  key={badge.codigo}
                  title={badge.descripcion}
                  className={`group flex flex-col items-center gap-xs ${
                    badge.earned ? '' : 'opacity-40 grayscale'
                  }`}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-2 border-on-background shadow-[4px_4px_0_0_#1d1c17] ${
                      badge.earned ? 'bg-tertiary text-on-tertiary' : 'bg-surface-variant'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={badge.earned ? { fontVariationSettings: "'FILL' 1" } : undefined}
                    >
                      {badge.earned ? badge.icon : 'lock'}
                    </span>
                  </div>
                  <span className="max-w-[64px] text-center font-mono text-[10px] font-bold uppercase leading-tight">
                    {badge.earned ? badge.nombre : '???'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-4 border-on-background bg-surface-container p-md shadow-[8px_8px_0_0_#1d1c17] lg:col-span-5">
          <div className="mb-md flex items-center gap-sm border-b-2 border-on-background pb-sm">
            <span className="material-symbols-outlined">list_alt</span>
            <h2 className="font-headline text-2xl font-bold uppercase md:text-4xl">Recientes</h2>
          </div>
          <div className="space-y-sm">
            {assignmentsError ? (
              <div className="border-2 border-on-background bg-error-container p-sm text-on-error-container">
                <p className="text-sm font-bold">{assignmentsError}</p>
                <button
                  type="button"
                  onClick={loadRecentAssignments}
                  className="mt-xs font-mono text-xs font-bold uppercase text-primary hover:underline"
                >
                  Reintentar
                </button>
              </div>
            ) : recentCompleted.length === 0 ? (
              <p className="font-mono text-xs uppercase text-on-surface-variant">
                Aún no has completado tareas.
              </p>
            ) : (
              recentCompleted.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-sm border-2 border-on-background bg-surface-container-lowest p-sm shadow-[4px_4px_0_0_#1d1c17]"
                >
                  <div className="flex items-center gap-sm min-w-0 flex-1">
                    <div className="bg-primary-container border border-on-background p-xs flex-shrink-0">
                      <span className="material-symbols-outlined text-on-primary-container">
                        check_circle
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold uppercase truncate">
                        {getMissionTitle(task.tipo, task.goal_value)}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {formatRelative(task.completed_at)}
                      </p>
                    </div>
                  </div>
                  {task.xp_ganado ? (
                    <p className="font-headline text-lg font-bold flex-shrink-0 text-primary">
                      +{task.xp_ganado} XP
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]">
        <div className="mb-md flex items-center justify-between border-b-2 border-on-background pb-sm">
          <h3 className="font-headline text-xl font-bold uppercase">Juegos Disponibles</h3>
          <Link
            to={routePaths.studentGames}
            className="font-mono text-xs font-bold uppercase text-primary hover:underline"
          >
            Ver todos -&gt;
          </Link>
        </div>
        {gamesError ? (
          <div className="border-2 border-on-background bg-error-container p-md text-on-error-container">
            <p className="font-bold">{gamesError}</p>
            <button
              type="button"
              onClick={loadGames}
              className="mt-sm border-2 border-on-background bg-surface px-sm py-xs font-headline text-sm font-bold uppercase text-on-surface shadow-[2px_2px_0_0_#1d1c17]"
            >
              Reintentar
            </button>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center gap-sm border-4 border-dashed border-on-background bg-surface-container-low p-lg text-center">
            <span className="material-symbols-outlined text-[48px] text-outline">
              stadia_controller
            </span>
            <p className="font-mono text-sm uppercase text-on-surface-variant">
              No hay juegos disponibles todavía.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
            {games.map((game) => (
            <Link
              key={game.id}
              to={game.locked ? '#' : game.route}
              onClick={game.locked ? (event) => event.preventDefault() : undefined}
              className={`group relative flex flex-col border-4 border-on-background bg-surface-container shadow-[8px_8px_0_0_#1d1c17] ${
                game.locked
                  ? 'cursor-not-allowed opacity-50 grayscale'
                  : 'transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]'
              }`}
            >
              <div className="relative h-36 overflow-hidden border-b-4 border-on-background bg-primary-fixed">
                {game.imageUrl ? (
                  <img
                    src={game.imageUrl}
                    alt={game.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="material-symbols-outlined text-[56px] text-primary">
                      stadia_controller
                    </span>
                  </div>
                )}
                {game.locked ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="material-symbols-outlined text-[40px] text-white">lock</span>
                  </div>
                ) : (
                  <span className="absolute left-sm top-sm border-2 border-on-background bg-secondary px-sm py-xs font-mono text-xs font-bold uppercase text-on-secondary">
                    {game.category}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-sm">
                <h4 className="font-headline text-base font-bold leading-tight">{game.title}</h4>
                <p className="mt-xs flex-1 text-xs text-on-surface-variant">{game.description}</p>
                {!game.locked && (
                  <div className="mt-sm flex items-center gap-xs font-mono text-xs font-bold text-primary">
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                    Jugar ahora
                  </div>
                )}
              </div>
            </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-lg flex flex-col items-stretch gap-md sm:flex-row sm:flex-wrap sm:justify-center">
        <Link
          to={routePaths.studentGames}
          className="flex items-center gap-sm border-4 border-on-background bg-surface-container-lowest px-xl py-md font-headline text-lg font-bold uppercase shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">storefront</span>
          Ver Catálogo
        </Link>
        <Link
          to={routePaths.studentTasks}
          className="flex items-center gap-sm border-4 border-on-background bg-primary px-xl py-md font-headline text-lg font-bold uppercase text-on-primary shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">rocket_launch</span>
          Mis Tareas
        </Link>
        <Link
          to={routePaths.studentLeaderboard}
          className="flex items-center gap-sm border-4 border-on-background bg-surface-container-lowest px-xl py-md font-headline text-lg font-bold uppercase shadow-[8px_8px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[4px_4px_0_0_#1d1c17]"
        >
          <span className="material-symbols-outlined">leaderboard</span>
          Clasificación
        </Link>
      </section>
    </StudentShell>
  );
}
