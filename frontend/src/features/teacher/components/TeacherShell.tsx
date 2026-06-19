import type { ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { routePaths } from '../../../app/router/routePaths';
import { useAuthStore } from '../../auth/store/authStore';

interface TeacherShellProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', to: routePaths.teacherDashboard },
  { label: 'Datos', icon: 'monitoring', to: routePaths.teacherData },
  { label: 'Generador', icon: 'menu_book', to: routePaths.teacherQuestions },
  { label: 'Banco', icon: 'database', to: routePaths.teacherBank },
  { label: 'Aula', icon: 'school', to: routePaths.teacherClassroom },
  { label: 'Adapta - G', icon: 'joystick', to: routePaths.teacherAdaptaGSetup },
];

export function TeacherShell({ title, children, action }: TeacherShellProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate(routePaths.login);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-64 flex-col border-r-4 border-on-background bg-surface-container-low p-md shadow-[4px_0_0_0_#1d1c17] md:flex">
        <div className="mb-lg">
          <Link to={routePaths.teacherDashboard} className="font-headline text-3xl font-bold uppercase tracking-normal text-primary">
            Adapta Class
          </Link>
          <p className="mt-xs text-sm font-medium uppercase text-on-surface-variant">Instructor Portal</p>
        </div>

        <nav className="flex flex-grow flex-col gap-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-base p-sm text-sm font-medium uppercase transition-colors',
                  isActive
                    ? 'border-b-2 border-primary font-bold text-primary'
                    : 'text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container',
                ].join(' ')
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          <Link
            to={routePaths.teacherQuestions}
            className="flex w-full items-center justify-center gap-xs border-2 border-on-background bg-primary-container p-md font-headline text-sm font-bold uppercase text-on-primary-container shadow-[4px_4px_0_0_#1d1c17]"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Cargar contenido
          </Link>
          <div className="mt-md flex items-center gap-sm border-2 border-on-background bg-surface-container-high p-sm">
            <div className="flex h-10 w-10 items-center justify-center border-2 border-on-background bg-primary-fixed font-headline font-bold text-on-primary-fixed">
              {user?.nombre?.slice(0, 2).toUpperCase() ?? 'PR'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold">{user?.nombre ?? 'Profesor'}</p>
              <button className="text-xs font-mono uppercase text-on-surface-variant" onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      <header className="fixed right-0 top-0 z-40 flex w-full items-center justify-between border-b-4 border-on-background bg-surface px-margin-mobile py-base shadow-[0_4px_0_0_#1d1c17] md:pl-[calc(16rem+48px)] md:pr-margin-desktop">
        <h1 className="font-headline text-lg font-bold uppercase text-primary md:text-2xl truncate">{title}</h1>
        <div className="flex items-center gap-xs md:gap-sm flex-shrink-0">
          {action}
          <Link
            to={routePaths.teacherDashboard}
            className="material-symbols-outlined p-xs hover:text-secondary"
            aria-label="Regresar al Dashboard"
            title="Regresar al Dashboard"
          >
            home
          </Link>
          <button className="material-symbols-outlined p-xs hover:text-secondary hidden md:block" type="button" aria-label="Notificaciones">
            notifications
          </button>
          <button className="material-symbols-outlined p-xs hover:text-secondary hidden md:block" type="button" aria-label="Ajustes">
            settings
          </button>
          <button className="material-symbols-outlined p-xs md:hidden" type="button" onClick={handleLogout} aria-label="Cerrar sesión">
            logout
          </button>
        </div>
      </header>

      <main className="min-h-screen px-margin-mobile pb-24 pt-[72px] md:ml-64 md:p-lg md:pt-[100px] md:pb-lg">
        <div className="mx-auto max-w-[1280px]">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t-4 border-on-background bg-surface px-2 py-1 shadow-[0_-4px_0_0_#1d1c17] md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-bold uppercase transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant',
              ].join(' ')
            }
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
