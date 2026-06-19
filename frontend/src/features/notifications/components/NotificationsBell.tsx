import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  notificationsService,
  type NotificationMissionType,
  type NotificationRow,
} from '../services/notifications.service';
import { routePaths } from '../../../app/router/routePaths';

// Short human-readable label for the mission attached to a notification.
// Kept here (vs. shared) because the bell is the only consumer for now.
function describeMission(
  tipo: NotificationMissionType,
  goalValue: number,
): string {
  switch (tipo) {
    case 'PLAY_TIME':
      return `${goalValue} minutos de juego`;
    case 'PLAY_DISTINCT':
      return `${goalValue} juegos distintos`;
    case 'ANSWER_CORRECT':
      return `${goalValue} respuestas correctas`;
    default:
      return `Objetivo ${goalValue}`;
  }
}

/**
 * Bell + dropdown that lives in the student shell header. Polls /notifications
 * /pending every 60s while the tab is visible; lighter than websockets and
 * enough for the "new mission" use case which isn't time-critical.
 */
export function NotificationsBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await notificationsService.getPending();
      setItems(response.data);
    } catch {
      // Silent — the bell can stale; we don't want to surface auth or
      // network errors here.
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    const interval = window.setInterval(refresh, 60_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      // Optimistic update — drop the read notification locally so the badge
      // count is right immediately, without waiting for the next poll.
      setItems((current) => current.filter((n) => n.id !== id));
    } catch {
      // Ignore; the next poll will reconcile.
    }
  };

  /**
   * Open the notification's target. Today every notification points at a
   * mission, so we navigate to the tasks page (where missions live) and
   * mark it as read in the same gesture (fire-and-forget — the UI doesn't
   * depend on it).
   */
  const handleOpen = (id: string) => {
    void handleRead(id);
    setOpen(false);
    navigate(routePaths.studentTasks);
  };

  const unread = items.length;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center border-2 border-on-background bg-surface-container-high shadow-[2px_2px_0_0_#1d1c17]"
        aria-label={`Notificaciones (${unread} sin leer)`}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center border-2 border-on-background bg-error px-1 font-mono text-xs font-bold text-on-error">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-sm w-80 border-4 border-on-background bg-surface-container-lowest p-sm shadow-[4px_4px_0_0_#1d1c17]">
          <p className="mb-sm border-b-2 border-on-background pb-xs font-mono text-xs font-bold uppercase">
            Notificaciones
          </p>
          {items.length === 0 ? (
            <p className="py-sm text-center text-sm text-on-surface-variant">Sin novedades.</p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-xs overflow-y-auto">
              {items.map((notification) => (
                <li
                  key={notification.id}
                  className="border-2 border-on-background bg-surface-container p-sm"
                >
                  <p className="text-sm">{notification.mensaje}</p>
                  {notification.mission && (
                    <p className="mt-xs font-mono text-xs uppercase text-on-surface-variant">
                      {describeMission(
                        notification.mission.tipo,
                        notification.mission.goal_value,
                      )}
                    </p>
                  )}
                  <div className="mt-xs flex items-center justify-between gap-sm">
                    <button
                      type="button"
                      onClick={() => handleOpen(notification.id)}
                      className="border-2 border-on-background bg-primary px-sm py-xs text-xs font-bold uppercase text-on-primary shadow-[2px_2px_0_0_#1d1c17]"
                    >
                      Ver misión
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRead(notification.id)}
                      className="text-xs font-bold uppercase text-primary hover:underline"
                    >
                      Marcar leída
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
