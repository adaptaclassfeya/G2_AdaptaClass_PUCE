import { useState } from 'react';
import { paralelosService } from '../../paralelos/services/paralelos.service';
import { useAuthStore } from '../../auth/store/authStore';
import { getApiErrorMessage } from '../../../lib/httpErrors';

/**
 * Rendered on the student dashboard when the user is already in a paralelo.
 * Lets them leave (e.g. wrong code, end of school year). Leaving only detaches
 * the student from the paralelo — their game sessions, attempts and XP stay,
 * so re-joining the same or a different paralelo never wipes their progress.
 */
export function MyParaleloCard() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');

  const handleLeave = async () => {
    if (!window.confirm('¿Salir de tu paralelo? Dejarás de ver las tareas asignadas.')) {
      return;
    }
    setError('');
    setIsLeaving(true);
    try {
      await paralelosService.leave();
      await hydrate();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No se pudo salir del paralelo.'));
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <section className="mb-lg border-4 border-on-background bg-surface-container-lowest p-md text-on-surface shadow-[4px_4px_0_0_#1d1c17] md:p-lg md:shadow-[8px_8px_0_0_#1d1c17]">
      <div className="flex flex-col items-start justify-between gap-sm md:flex-row md:items-center">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary">school</span>
          <div>
            <h3 className="font-headline text-lg font-bold uppercase">Estás en un paralelo</h3>
            <p className="text-sm text-on-surface-variant">
              Tu profesor puede asignarte tareas y verás tu progreso aquí.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLeave}
          disabled={isLeaving}
          className="border-2 border-on-background bg-surface px-md py-2 font-headline text-sm font-bold uppercase shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60"
        >
          {isLeaving ? 'Saliendo…' : 'Salir del paralelo'}
        </button>
      </div>
      {error && <p className="mt-sm font-mono text-sm font-bold text-error">{error}</p>}
    </section>
  );
}
