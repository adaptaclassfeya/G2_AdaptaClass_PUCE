import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../auth/store/authStore';
import {
  missionsService,
  type StudentMissionItem,
} from '../../missions/services/missions.service';

interface MissionProgressOverlayProps {
  /** Only render while a game is actively being played. */
  active: boolean;
}

const TYPE_META: Record<
  StudentMissionItem['tipo'],
  { icon: string; unit: string; label: string }
> = {
  PLAY_TIME: { icon: 'timer', unit: 'min', label: 'Tiempo de juego' },
  PLAY_DISTINCT: { icon: 'stadia_controller', unit: '', label: 'Juegos distintos' },
  ANSWER_CORRECT: { icon: 'check_circle', unit: '', label: 'Respuestas correctas' },
};

// Backend recalculates mission progress on every heartbeat (30s) and answer
// attempt. We refresh shortly after those via the `mission:refresh` event,
// and keep a slow poll as a safety net.
const POLL_MS = 20_000;
const REFRESH_DEBOUNCE_MS = 1_500;
const CELEBRATION_MS = 4_500;

function ratio(item: StudentMissionItem): number {
  return item.goal_value > 0 ? item.current_value / item.goal_value : 0;
}

/**
 * Floating, non-interactive widget that shows the student how close they are
 * to finishing their missions while they play. Rendered once inside
 * GameConsoleWrapper so every game inherits it. Self-contained: it fetches its
 * own data and silently no-ops for teachers or students without a paralelo.
 */
export function MissionProgressOverlay({ active }: MissionProgressOverlayProps) {
  const role = useAuthStore((state) => state.user?.role);
  const paraleloId = useAuthStore((state) => state.user?.paralelo_id);
  const isStudentInParalelo = role === 'STUDENT' && Boolean(paraleloId);

  const [pending, setPending] = useState<StudentMissionItem[]>([]);
  const [celebration, setCelebration] = useState<number | null>(null);

  const inFlight = useRef(false);
  const knownCompleted = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const celebrationTimer = useRef<number | null>(null);

  const refresh = useCallback(() => {
    if (!isStudentInParalelo || inFlight.current) return;
    inFlight.current = true;
    missionsService
      .getMyMissions()
      .then((data) => {
        // Detect missions that flipped to completed since the last fetch so we
        // can flash a celebration. Skip the very first fetch (everything
        // already-completed shouldn't celebrate on game entry).
        const newlyCompleted = data.completed.filter(
          (m) => !knownCompleted.current.has(m.id),
        );
        data.completed.forEach((m) => knownCompleted.current.add(m.id));

        if (initialized.current && newlyCompleted.length > 0) {
          setCelebration(newlyCompleted.length);
          if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
          celebrationTimer.current = window.setTimeout(
            () => setCelebration(null),
            CELEBRATION_MS,
          );
        }
        initialized.current = true;

        // Surface the mission closest to completion first — the most
        // motivating one to show.
        setPending([...data.pending].sort((a, b) => ratio(b) - ratio(a)));
      })
      .catch(() => {
        // Non-critical overlay; never interrupt gameplay over a failed poll.
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [isStudentInParalelo]);

  useEffect(() => {
    if (!active || !isStudentInParalelo) return;

    // Reset per-session detection state on each activation.
    knownCompleted.current = new Set();
    initialized.current = false;

    // Defer the first fetch a tick to stay clear of the cascading-render lint
    // rule (same pattern used by the student dashboard loaders).
    const firstFetch = window.setTimeout(refresh, 0);

    let debounce: number | null = null;
    const onRefreshEvent = () => {
      if (debounce) window.clearTimeout(debounce);
      debounce = window.setTimeout(refresh, REFRESH_DEBOUNCE_MS);
    };
    window.addEventListener('mission:refresh', onRefreshEvent);
    const poll = window.setInterval(refresh, POLL_MS);

    return () => {
      window.clearTimeout(firstFetch);
      window.removeEventListener('mission:refresh', onRefreshEvent);
      window.clearInterval(poll);
      if (debounce) window.clearTimeout(debounce);
      if (celebrationTimer.current) window.clearTimeout(celebrationTimer.current);
    };
  }, [active, isStudentInParalelo, refresh]);

  if (!active || !isStudentInParalelo) return null;
  if (pending.length === 0 && celebration === null) return null;

  const top = pending[0];
  const extra = pending.length - 1;

  return (
    // Keep non-interactive: Phaser answer buttons live in the canvas below,
    // and this fixed HUD must never intercept taps after a modal re-render.
    <div className="pointer-events-none fixed left-1/2 top-2 z-30 w-[min(92vw,360px)] -translate-x-1/2">
      {celebration !== null && (
        <div className="mb-2 flex items-center justify-center gap-2 border-4 border-on-background bg-tertiary px-3 py-2 text-on-tertiary shadow-[4px_4px_0_0_#1d1c17]">
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            emoji_events
          </span>
          <span className="font-headline text-sm font-bold uppercase">
            {celebration > 1
              ? `¡${celebration} misiones completadas!`
              : '¡Misión completada! +100 XP'}
          </span>
        </div>
      )}

      {top && (
        <div className="border-4 border-on-background bg-surface-container-lowest px-3 py-2 shadow-[4px_4px_0_0_#1d1c17]">
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1">
              <span
                className="material-symbols-outlined text-base text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {TYPE_META[top.tipo].icon}
              </span>
              <span className="truncate font-mono text-[10px] font-bold uppercase text-on-surface-variant">
                {TYPE_META[top.tipo].label}
              </span>
            </div>
            <span className="flex-shrink-0 font-headline text-sm font-bold">
              {Math.min(top.current_value, top.goal_value)}/{top.goal_value}
              {TYPE_META[top.tipo].unit ? ` ${TYPE_META[top.tipo].unit}` : ''}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden border-2 border-on-background bg-surface-variant">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(ratio(top) * 100, 100)}%` }}
            />
          </div>
          {extra > 0 && (
            <p className="mt-1 text-right font-mono text-[9px] font-bold uppercase text-on-surface-variant">
              +{extra} misión{extra > 1 ? 'es' : ''} más
            </p>
          )}
        </div>
      )}
    </div>
  );
}
