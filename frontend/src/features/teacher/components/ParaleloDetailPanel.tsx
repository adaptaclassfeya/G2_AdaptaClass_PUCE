import { useCallback, useEffect, useState } from 'react';
import { paralelosService, type ParaleloDetail } from '../../paralelos/services/paralelos.service';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface ParaleloDetailPanelProps {
  paraleloId: string;
}

/**
 * Inline panel that lists the students enrolled in a paralelo. Reuses
 * GET /paralelos/:id which already eager-loads the student rows. Lazily
 * fetched — only when the teacher expands the card.
 */
export function ParaleloDetailPanel({ paraleloId }: ParaleloDetailPanelProps) {
  const [detail, setDetail] = useState<ParaleloDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    paralelosService
      .getOne(paraleloId)
      .then((response) => setDetail(response.data))
      .catch((requestError: unknown) => {
        setError(getApiErrorMessage(requestError, 'No pudimos cargar los estudiantes.'));
      })
      .finally(() => setLoading(false));
  }, [paraleloId]);

  // Defer one tick to keep the initial setState out of the render
  // commit phase — matches the project-wide pattern enforced by the
  // react-hooks/set-state-in-effect lint rule.
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) {
    return (
      <p className="mt-md border-t-2 border-dashed border-on-background/30 pt-md text-sm text-on-surface-variant">
        Cargando estudiantes...
      </p>
    );
  }

  if (error) {
    return (
      <div className="mt-md border-t-2 border-dashed border-on-background/30 pt-md">
        <p className="text-sm font-bold text-error">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-xs border-2 border-on-background bg-surface px-sm py-xs text-xs font-bold uppercase shadow-[2px_2px_0_0_#1d1c17]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!detail || detail.students.length === 0) {
    return (
      <p className="mt-md border-t-2 border-dashed border-on-background/30 pt-md text-sm italic text-on-surface-variant">
        Aún no hay estudiantes inscritos.
      </p>
    );
  }

  return (
    <div className="mt-md border-t-2 border-dashed border-on-background/30 pt-md">
      <p className="mb-sm font-mono text-xs font-bold uppercase">Estudiantes inscritos</p>
      <ul className="space-y-xs">
        {detail.students.map((student) => (
          <li
            key={student.user_id}
            className="flex items-center justify-between border-2 border-on-background bg-surface-container-low px-sm py-2 text-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{student.nombre}</p>
              <p className="truncate font-mono text-xs text-on-surface-variant">
                {student.user.email}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-sm">
              <span className="border-2 border-on-background bg-primary-fixed px-sm py-xs font-mono text-xs font-bold">
                {student.puntos_xp} XP
              </span>
              <span className="flex items-center gap-xs font-mono text-xs text-orange-600">
                <span className="material-symbols-outlined text-sm">local_fire_department</span>
                {student.racha_dias}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
