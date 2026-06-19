import { useState } from 'react';
import type { FormEvent } from 'react';
import { missionsService } from '../services/missions.service';
import { getApiErrorMessage } from '../../../lib/httpErrors';

interface MissionFormProps {
  paraleloId: string;
  /**
   * Display-only name + grade of the destination paralelo. Surfacing this
   * inside the form (vs. relying on the surrounding card) keeps the teacher
   * from accidentally assigning a mission to the wrong classroom when they
   * have several open — which is exactly what tripped up the original tester.
   */
  paraleloNombre?: string;
  paraleloGrado?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

type MissionType = 'PLAY_TIME' | 'PLAY_DISTINCT' | 'ANSWER_CORRECT';

// Sensible defaults when the teacher switches mission type so the
// numeric input is never blank or carrying a value that's nonsense for
// the new tipo (e.g. "15 juegos distintos" or "3 minutos").
const DEFAULT_GOAL: Record<MissionType, number> = {
  PLAY_TIME: 15,
  PLAY_DISTINCT: 3,
  ANSWER_CORRECT: 10,
};

const GOAL_LABEL: Record<MissionType, string> = {
  PLAY_TIME: 'Minutos requeridos',
  PLAY_DISTINCT: 'Cantidad de juegos distintos',
  ANSWER_CORRECT: 'Preguntas correctas requeridas',
};

const TIPO_LABEL: Record<MissionType, string> = {
  PLAY_TIME: 'Tiempo total de juego (minutos)',
  PLAY_DISTINCT: 'Jugar diferentes juegos',
  ANSWER_CORRECT: 'Preguntas correctas',
};

// XP shortcuts so the teacher doesn't have to type the number when they
// want a "standard" reward. The free input still lets them pick anything
// between 10 and 1000.
const XP_SUGGESTIONS = [50, 100, 200, 500];

// Default datetime-local value: 7 days from now at 23:59, formatted as
// YYYY-MM-DDTHH:mm (what <input type="datetime-local"> expects).
function defaultFechaLimite(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(23, 59, 0, 0);
  return date.toISOString().slice(0, 16);
}

export function MissionForm({
  paraleloId,
  paraleloNombre,
  paraleloGrado,
  onSuccess,
  onCancel,
}: MissionFormProps) {
  const [tipo, setTipo] = useState<MissionType>('PLAY_TIME');
  const [goalValue, setGoalValue] = useState<number>(DEFAULT_GOAL.PLAY_TIME);
  const [xpReward, setXpReward] = useState<number>(100);
  const [descripcion, setDescripcion] = useState<string>('');
  const [fechaLimite, setFechaLimite] = useState<string>(defaultFechaLimite);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (goalValue <= 0) {
      setError('El objetivo debe ser mayor a 0.');
      return;
    }
    if (xpReward < 10 || xpReward > 1000) {
      setError('La recompensa de XP debe estar entre 10 y 1000.');
      return;
    }
    if (descripcion.length > 500) {
      setError('La descripción no puede superar los 500 caracteres.');
      return;
    }
    if (new Date(fechaLimite) <= new Date()) {
      setError('La fecha límite debe ser en el futuro.');
      return;
    }

    setLoading(true);
    try {
      await missionsService.create({
        paralelo_id: paraleloId,
        tipo,
        goal_value: goalValue,
        fecha_limite: new Date(fechaLimite).toISOString(),
        descripcion: descripcion.trim() || undefined,
        xp_reward: xpReward,
      });
      onSuccess();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No se pudo crear la misión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-md flex flex-col gap-md border-4 border-on-background bg-surface-container-lowest p-sm shadow-[4px_4px_0_0_#1d1c17] md:p-md md:shadow-[6px_6px_0_0_#1d1c17]"
    >
      <div className="border-b-2 border-on-background pb-sm">
        <h4 className="font-headline text-lg font-bold uppercase text-primary md:text-xl">
          Nueva Misión
        </h4>
        {paraleloNombre && (
          <p className="mt-xs flex flex-wrap items-center gap-xs font-mono text-xs uppercase">
            <span className="text-on-surface-variant">Asignar a:</span>
            <span className="border-2 border-on-background bg-primary px-sm py-xs font-bold text-on-primary shadow-[2px_2px_0_0_#1d1c17]">
              {paraleloNombre}
              {paraleloGrado ? ` · ${paraleloGrado}` : ''}
            </span>
          </p>
        )}
        <p className="mt-sm text-sm text-on-surface-variant">
          Diseña un reto para este paralelo. Define qué hay que cumplir, cuándo vence y cuánta XP
          gana cada estudiante al completarlo. La XP suma directamente al ranking del paralelo.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="border-2 border-on-background bg-error-container p-sm text-sm font-bold text-on-error-container"
        >
          {error}
        </p>
      )}

      <label className="flex flex-col gap-xs text-sm font-bold uppercase">
        Tipo de objetivo
        <select
          value={tipo}
          onChange={(event) => {
            const value = event.target.value as MissionType;
            setTipo(value);
            setGoalValue(DEFAULT_GOAL[value]);
          }}
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
        >
          {(Object.keys(TIPO_LABEL) as MissionType[]).map((key) => (
            <option key={key} value={key}>
              {TIPO_LABEL[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-xs text-sm font-bold uppercase">
        {GOAL_LABEL[tipo]}
        <input
          type="number"
          min={1}
          value={goalValue}
          onChange={(event) =>
            setGoalValue(parseInt(event.target.value, 10) || 0)
          }
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </label>

      <div className="flex flex-col gap-xs">
        <label className="text-sm font-bold uppercase">
          Recompensa al completar
        </label>
        <div className="flex flex-wrap gap-xs">
          {XP_SUGGESTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setXpReward(value)}
              className={[
                'flex items-center gap-xs border-2 border-on-background px-sm py-xs font-mono text-xs font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
                xpReward === value
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface hover:bg-surface-variant',
              ].join(' ')}
            >
              +{value} XP
            </button>
          ))}
        </div>
        <div className="flex items-center gap-sm">
          <input
            type="number"
            min={10}
            max={1000}
            step={10}
            value={xpReward}
            onChange={(event) =>
              setXpReward(parseInt(event.target.value, 10) || 0)
            }
            className="w-32 border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-on-surface-variant">
            XP (entre 10 y 1000) — suma al ranking de tus estudiantes.
          </span>
        </div>
      </div>

      <label className="flex flex-col gap-xs text-sm font-bold uppercase">
        Descripción (opcional)
        <textarea
          value={descripcion}
          onChange={(event) => setDescripcion(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Ej: Reto semanal de lectura: dedica 5 minutos diarios a explorar los juegos del paralelo."
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xxs font-mono uppercase text-on-surface-variant">
          {descripcion.length}/500
        </span>
      </label>

      <label className="flex flex-col gap-xs text-sm font-bold uppercase">
        Fecha y hora límite
        <input
          type="datetime-local"
          value={fechaLimite}
          onChange={(event) => setFechaLimite(event.target.value)}
          className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
          required
        />
      </label>

      <div className="mt-xs flex flex-col gap-sm sm:flex-row sm:justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="border-2 border-on-background bg-surface px-md py-2 font-headline text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-sm border-2 border-on-background bg-primary px-md py-2 font-headline text-sm font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-wait disabled:opacity-70"
        >
          <span className="material-symbols-outlined text-base">flag</span>
          {loading ? 'Asignando…' : 'Asignar misión'}
        </button>
      </div>
    </form>
  );
}
