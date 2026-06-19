import { useEffect, useState, useCallback } from 'react';
import { missionsService } from '../services/missions.service';
import type { Mission, MissionProgressDetail } from '../services/missions.service';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface MissionsPanelProps {
  paraleloId: string;
  /** Bumped by the parent when a new mission is created to force a refresh. */
  refreshKey?: number;
}

function tipoLabel(tipo: Mission['tipo']): string {
  if (tipo === 'PLAY_TIME') return 'Tiempo de juego';
  if (tipo === 'PLAY_DISTINCT') return 'Juegos distintos';
  if (tipo === 'ANSWER_CORRECT') return 'Preguntas correctas';
  return tipo;
}

function goalLabel(tipo: Mission['tipo'], value: number): string {
  if (tipo === 'PLAY_TIME') return `${value} minutos`;
  if (tipo === 'PLAY_DISTINCT') return `${value} juegos`;
  if (tipo === 'ANSWER_CORRECT') return `${value} respuestas correctas`;
  return String(value);
}

function unitLabel(tipo: Mission['tipo']): string {
  if (tipo === 'PLAY_TIME') return 'min';
  if (tipo === 'PLAY_DISTINCT') return 'juegos';
  if (tipo === 'ANSWER_CORRECT') return 'correctas';
  return '';
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function MissionsPanel({ paraleloId, refreshKey = 0 }: MissionsPanelProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected mission for the per-student breakdown modal.
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [detail, setDetail] = useState<MissionProgressDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await missionsService.listForTeacher(paraleloId);
      setMissions(data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No pudimos cargar las misiones de este paralelo.'));
    } finally {
      setLoading(false);
    }
  }, [paraleloId]);

  useEffect(() => {
    const timer = window.setTimeout(fetchMissions, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMissions, refreshKey]);

  const closeDetail = () => {
    setSelectedMission(null);
    setDetail(null);
    setDetailError(null);
  };

  const handleDelete = async (mission: Mission) => {
    if (!window.confirm('¿Eliminar esta misión? Se perderá el progreso histórico asociado.')) {
      return;
    }
    setDeletingId(mission.id);
    try {
      await missionsService.remove(mission.id);
      setMissions((current) => current.filter((m) => m.id !== mission.id));
      if (selectedMission?.id === mission.id) {
        closeDetail();
      }
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No se pudo eliminar la misión.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenDetail = async (mission: Mission) => {
    setSelectedMission(mission);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const data = await missionsService.getProgressDetail(mission.id);
      setDetail(data);
    } catch (requestError: unknown) {
      setDetailError(getApiErrorMessage(requestError, 'No pudimos cargar el progreso por estudiante.'));
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mt-md border-4 border-dashed border-on-background bg-surface-container-lowest p-md text-center text-sm uppercase text-on-surface-variant">
        Cargando misiones…
      </div>
    );
  }

  if (error && missions.length === 0) {
    return (
      <div className="mt-md border-4 border-on-background bg-error-container p-md text-on-error-container shadow-[4px_4px_0_0_#1d1c17]">
        <p className="text-sm font-bold">{error}</p>
        <button
          type="button"
          onClick={fetchMissions}
          className="mt-sm border-2 border-on-background bg-surface px-sm py-xs font-headline text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-md flex flex-col gap-md">
      {error && missions.length > 0 && (
        <p
          role="alert"
          className="border-2 border-on-background bg-error-container p-sm text-sm font-bold text-on-error-container"
        >
          {error}
        </p>
      )}

      {missions.length === 0 ? (
        <div className="flex flex-col items-center gap-sm border-4 border-dashed border-on-background bg-surface-container-lowest p-md text-center">
          <span className="material-symbols-outlined text-3xl text-outline">flag</span>
          <p className="font-mono text-xs uppercase text-on-surface-variant">
            Aún no hay misiones asignadas a este paralelo.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-sm">
          {missions.map((mission) => {
            const total = mission.total_students;
            const completed = mission.completed_count;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const isDeleting = deletingId === mission.id;

            return (
              <li
                key={mission.id}
                className="border-2 border-on-background bg-surface-container-lowest p-sm shadow-[3px_3px_0_0_#1d1c17]"
              >
                <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-xs">
                      <span className="inline-block border-2 border-on-background bg-secondary px-sm py-xs font-mono text-xxs font-bold uppercase text-on-secondary">
                        {tipoLabel(mission.tipo)}
                      </span>
                      <span className="inline-flex items-center gap-xs border-2 border-on-background bg-tertiary px-sm py-xs font-mono text-xxs font-bold uppercase text-on-tertiary">
                        <span className="material-symbols-outlined text-sm">stars</span>
                        +{mission.xp_reward} XP
                      </span>
                    </div>
                    <h4 className="mt-xs font-headline text-base font-bold uppercase text-primary md:text-lg">
                      Meta: {goalLabel(mission.tipo, mission.goal_value)}
                    </h4>
                    {mission.descripcion && (
                      <p className="mt-xs text-sm italic text-on-surface">
                        “{mission.descripcion}”
                      </p>
                    )}
                    <p className="mt-xs flex items-center gap-xs text-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      Vence el {formatDateTime(mission.fecha_limite)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(mission)}
                    disabled={isDeleting}
                    className="self-start border-2 border-on-background bg-error-container px-sm py-xs font-mono text-xs font-bold uppercase text-on-error-container shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60"
                    title="Eliminar misión"
                  >
                    {isDeleting ? 'Borrando…' : 'Eliminar'}
                  </button>
                </div>

                <div className="mt-sm">
                  <div className="mb-xs flex justify-between text-xs font-bold">
                    <span>Avance del paralelo</span>
                    <span className="font-mono">
                      {completed}/{total} · {percent}%
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden border-2 border-on-background bg-surface-variant">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenDetail(mission)}
                  className="mt-sm flex w-full items-center justify-center gap-xs border-2 border-on-background bg-surface px-sm py-xs font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
                >
                  <span className="material-symbols-outlined text-sm">analytics</span>
                  Ver progreso por estudiante
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selectedMission && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-sm"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col border-4 border-on-background bg-surface-container-lowest shadow-[6px_6px_0_0_#1d1c17] md:shadow-[10px_10px_0_0_#1d1c17]">
            <header className="flex items-start justify-between gap-sm border-b-4 border-on-background bg-primary p-sm text-on-primary md:p-md">
              <div>
                <h3 className="font-headline text-lg font-bold uppercase md:text-2xl">
                  Progreso por estudiante
                </h3>
                <p className="mt-xs font-mono text-xxs uppercase opacity-90 md:text-xs">
                  {tipoLabel(selectedMission.tipo)} · Meta:{' '}
                  {goalLabel(selectedMission.tipo, selectedMission.goal_value)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="flex h-9 w-9 items-center justify-center border-2 border-on-background bg-surface-container-lowest text-on-surface shadow-[2px_2px_0_0_#1d1c17]"
                aria-label="Cerrar"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-sm md:p-md">
              {detailLoading ? (
                <p className="py-md text-center font-mono text-xs uppercase text-on-surface-variant">
                  Cargando progreso…
                </p>
              ) : detailError ? (
                <div className="border-2 border-on-background bg-error-container p-sm text-sm font-bold text-on-error-container">
                  {detailError}
                </div>
              ) : detail ? (
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-on-background bg-surface-container">
                      <th className="p-sm font-mono text-xs uppercase">Estudiante</th>
                      <th className="p-sm font-mono text-xs uppercase">Progreso</th>
                      <th className="p-sm font-mono text-xs uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.students.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-md text-center font-mono text-xs uppercase text-on-surface-variant"
                        >
                          No hay estudiantes inscritos en este paralelo.
                        </td>
                      </tr>
                    ) : (
                      detail.students.map((student) => (
                        <tr
                          key={student.user_id}
                          className="border-b-2 border-on-background last:border-b-0"
                        >
                          <td className="p-sm">
                            <p className="font-bold">{student.nombre}</p>
                            <p className="font-mono text-xxs text-on-surface-variant">
                              {student.email}
                            </p>
                          </td>
                          <td className="p-sm font-mono text-xs">
                            {student.current_value} / {detail.goal_value} {unitLabel(detail.tipo)}
                          </td>
                          <td className="p-sm">
                            {student.completado ? (
                              <span className="inline-flex items-center gap-xs border-2 border-on-background bg-primary-container px-sm py-xs font-mono text-xxs font-bold uppercase text-on-primary-container">
                                <span className="material-symbols-outlined text-sm">
                                  check_circle
                                </span>
                                Completado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-xs border-2 border-on-background bg-surface-variant px-sm py-xs font-mono text-xxs font-bold uppercase">
                                <span className="material-symbols-outlined text-sm">pending</span>
                                En progreso
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : null}
            </div>

            <footer className="border-t-4 border-on-background bg-surface-container p-sm text-right md:p-md">
              <button
                type="button"
                onClick={closeDetail}
                className="border-2 border-on-background bg-surface px-md py-2 font-headline text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
              >
                Cerrar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
