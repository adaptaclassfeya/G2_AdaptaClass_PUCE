import { useEffect, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <BrowserRouter>{children}</BrowserRouter>;
}
