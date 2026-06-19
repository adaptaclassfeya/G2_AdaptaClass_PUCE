import { useState } from 'react';
import type { FormEvent } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { useAuthStore } from '../../auth/store/authStore';
import { paralelosService } from '../../paralelos/services/paralelos.service';

// The backend enforces the alphabet (no O/0/I/1) via DTO. Mirroring the
// same restriction here gives users immediate feedback and prevents a
// round-trip for typos.
const CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export function JoinParaleloCard() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const normalized = codigo.trim().toUpperCase();
    if (!CODE_REGEX.test(normalized)) {
      setError('El código debe tener 6 caracteres (sin O, 0, I, 1).');
      return;
    }
    setError('');
    setIsJoining(true);
    try {
      await paralelosService.join(normalized);
      // Re-pull /auth/me so user.paralelo_id propagates to the rest of the SPA.
      await hydrate();
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No se pudo unir al paralelo.'));
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <section className="mb-lg border-4 border-on-background bg-primary-container p-md text-on-primary-container shadow-[4px_4px_0_0_#1d1c17] md:p-lg md:shadow-[8px_8px_0_0_#1d1c17]">
      <div className="mb-md flex items-center gap-sm border-b-2 border-on-background pb-sm">
        <span className="material-symbols-outlined">school</span>
        <h3 className="font-headline text-xl font-bold uppercase">Únete a tu paralelo</h3>
      </div>
      <p className="mb-md text-sm leading-relaxed md:text-base">
        Ingresa el código de 6 caracteres que te dio tu profesor para empezar a recibir tareas.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-sm md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-xs text-sm font-bold uppercase">
          Código de acceso
          <input
            className="border-2 border-on-background bg-surface px-sm py-2 font-mono text-lg font-bold uppercase tracking-widest text-on-surface shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
            value={codigo}
            onChange={(event) => setCodigo(event.target.value.toUpperCase())}
            maxLength={6}
            placeholder="EJ: KX7T2M"
            autoComplete="off"
            required
          />
        </label>
        <button
          type="submit"
          disabled={isJoining}
          className="self-stretch border-2 border-on-background bg-primary px-md py-2.5 font-headline text-sm font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:opacity-60 md:self-end"
        >
          {isJoining ? 'Uniéndome...' : 'Unirme'}
        </button>
      </form>
      {error && <p className="mt-sm font-mono text-sm font-bold text-error">{error}</p>}
    </section>
  );
}
