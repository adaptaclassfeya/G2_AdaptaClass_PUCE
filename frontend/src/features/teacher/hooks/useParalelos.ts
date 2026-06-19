import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import { paralelosService } from '../../paralelos/services/paralelos.service';
import type { Paralelo } from '../../paralelos/types/paralelo.types';

/**
 * Lists every paralelo owned by the logged-in teacher. The archive/unarchive
 * UX was removed — the backend now returns all paralelos regardless of
 * `activo` so there's no filter to tweak here.
 */
export function useParalelos() {
  const [paralelos, setParalelos] = useState<Paralelo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await paralelosService.getAll();
      setParalelos(response.data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, 'No se pudieron cargar los paralelos'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    paralelosService
      .getAll()
      .then((response) => {
        if (mounted) setParalelos(response.data);
      })
      .catch((requestError: unknown) => {
        if (mounted) {
          setError(getApiErrorMessage(requestError, 'No se pudieron cargar los paralelos'));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return { paralelos, isLoading, error, refresh };
}
