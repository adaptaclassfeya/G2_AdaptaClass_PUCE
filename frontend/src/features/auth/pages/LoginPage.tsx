import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboardRoute, routePaths } from '../../../app/router/routePaths';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await login(form);
      const user = useAuthStore.getState().user;
      navigate(getDashboardRoute(user?.role));
    } catch {
      // The store exposes the error for the form.
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-margin-mobile py-md">
      <div className="bg-grid-retro absolute inset-0 opacity-40" />
      <section className="relative w-full max-w-[380px] border-4 border-on-background bg-surface-container-lowest p-sm shadow-[6px_6px_0_0_#1d1c17] md:p-md md:shadow-[8px_8px_0_0_#1d1c17]">
        <div className="mb-sm border-b-4 border-on-background pb-sm">
          <Link to={routePaths.home} className="font-headline text-xl font-bold uppercase text-primary md:text-2xl">
            Adapta Class
          </Link>
          <p className="mt-xs text-sm text-on-surface-variant">Bienvenido de vuelta</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-sm">
          {error && (
            <button
              type="button"
              onClick={clearError}
              className="border-2 border-on-background bg-error-container p-sm text-left text-sm text-on-error-container"
            >
              {error}
            </button>
          )}

          <label className="flex flex-col gap-xs text-sm font-bold uppercase">
            Correo electrónico
            <input
              className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="tu@correo.com"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase">
            Contraseña
            <input
              className="border-2 border-on-background bg-surface px-sm py-2 font-normal normal-case shadow-[3px_3px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="********"
              required
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-xs border-2 border-on-background bg-primary px-md py-2.5 font-headline text-base font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-wait disabled:opacity-70"
          >
            {isLoading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="mt-sm text-center text-sm text-on-surface-variant">
          ¿No tienes cuenta?{' '}
          <Link className="font-bold text-primary underline" to={routePaths.register}>
            Regístrate aquí
          </Link>
        </p>
      </section>
    </main>
  );
}
