import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { routePaths } from '../../../app/router/routePaths';
import { useAuthStore } from '../store/authStore';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [validationError, setValidationError] = useState('');
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    isDocente: false,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setValidationError('');

    if (form.password !== form.confirmPassword) {
      setValidationError('Las contrasenas no coinciden');
      return;
    }

    if (form.password.length < 8) {
      setValidationError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      await register({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        isDocente: form.isDocente,
      });
      navigate(routePaths.login);
    } catch {
      // The store exposes the error for the form.
    }
  };

  const formError = error || validationError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-margin-mobile py-lg">
      <section className="w-full max-w-2xl border-4 border-on-background bg-surface-container-lowest p-md shadow-[8px_8px_0_0_#1d1c17]">
        <div className="mb-md border-b-4 border-on-background pb-md">
          <Link to={routePaths.home} className="font-headline text-2xl font-bold uppercase text-primary">
            Adapta Class
          </Link>
          <p className="mt-xs text-on-surface-variant">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-md md:grid-cols-2">
          {formError && (
            <button
              type="button"
              onClick={() => {
                clearError();
                setValidationError('');
              }}
              className="border-2 border-on-background bg-error-container p-sm text-left text-on-error-container md:col-span-2"
            >
              {formError}
            </button>
          )}

          <label className="flex flex-col gap-xs text-sm font-bold uppercase md:col-span-2">
            Nombre completo
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              value={form.nombre}
              onChange={(event) => setForm({ ...form, nombre: event.target.value })}
              placeholder="Juan Pérez"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase md:col-span-2">
            Correo electrónico
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
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
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="********"
              required
            />
          </label>

          <label className="flex flex-col gap-xs text-sm font-bold uppercase">
            Confirmar
            <input
              className="border-2 border-on-background bg-surface px-sm py-sm font-normal normal-case shadow-[4px_4px_0_0_#1d1c17] outline-none focus:ring-2 focus:ring-primary"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              placeholder="********"
              required
            />
          </label>

          <div className="flex flex-col gap-sm md:col-span-2">
            <span className="text-sm font-bold uppercase">Tipo de cuenta</span>
            <div className="grid grid-cols-2 gap-sm">
              <button
                type="button"
                onClick={() => setForm({ ...form, isDocente: false })}
                className={[
                  'flex flex-col items-center gap-xs border-2 border-on-background p-xs sm:p-md transition-all',
                  !form.isDocente
                    ? 'bg-primary text-on-primary shadow-none translate-x-0.5 translate-y-0.5'
                    : 'bg-surface-container-lowest shadow-[4px_4px_0_0_#1d1c17] hover:bg-surface-variant',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-[24px] sm:text-[32px]">school</span>
                <span className="font-headline text-xs sm:text-base md:text-lg font-bold uppercase">Estudiante</span>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, isDocente: true })}
                className={[
                  'flex flex-col items-center gap-xs border-2 border-on-background p-xs sm:p-md transition-all',
                  form.isDocente
                    ? 'bg-primary text-on-primary shadow-none translate-x-0.5 translate-y-0.5'
                    : 'bg-surface-container-lowest shadow-[4px_4px_0_0_#1d1c17] hover:bg-surface-variant',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-[24px] sm:text-[32px]">person_book</span>
                <span className="font-headline text-xs sm:text-base md:text-lg font-bold uppercase">Docente</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="border-2 border-on-background bg-primary px-md py-sm font-headline text-lg font-bold uppercase text-on-primary shadow-[4px_4px_0_0_#1d1c17] transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_0_#1d1c17] disabled:cursor-wait disabled:opacity-70 md:col-span-2"
          >
            {isLoading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-md text-center text-sm text-on-surface-variant">
          ¿Ya tienes cuenta?{' '}
          <Link className="font-bold text-primary underline" to={routePaths.login}>
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
