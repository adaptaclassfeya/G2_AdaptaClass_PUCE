import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore';
import type { UserRole } from '../../types/auth';
import { getDashboardRoute, routePaths } from './routePaths';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: UserRole;
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  // Session lives in the httpOnly cookie, not in JS state. Presence of a
  // hydrated `user` is our only proxy for "logged in"; the cookie is the
  // server-side source of truth and is validated on every API call.
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to={routePaths.login} replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  return <>{children}</>;
}

export function AuthRedirect({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();

  if (user) {
    return <Navigate to={getDashboardRoute(user.role)} replace />;
  }

  return <>{children}</>;
}
