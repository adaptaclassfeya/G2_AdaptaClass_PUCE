import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../auth/store/authStore';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import {
  dashboardService,
  type AdminDashboardData,
} from '../../teacher/services/dashboard.service';
import { GrowthAreaChart } from '../components/dashboard/GrowthAreaChart';
import { ActivityBarChart } from '../components/dashboard/ActivityBarChart';
import { TopGamesPieChart } from '../components/dashboard/TopGamesPieChart';
import { AiAdoptionScatter } from '../components/dashboard/AiAdoptionScatter';

interface KpiProps {
  label: string;
  value: string | number;
  icon: string;
  className: string;
}

function Kpi({ label, value, icon, className }: KpiProps) {
  return (
    <div className={`border-4 border-on-background p-sm md:p-md shadow-[4px_4px_0_0_#1d1c17] ${className}`}>
      <p className="mb-xs font-mono text-[10px] uppercase opacity-80 md:text-xs">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-headline text-2xl font-bold md:text-4xl">{value}</h4>
        <span className="material-symbols-outlined text-2xl md:text-3xl">{icon}</span>
      </div>
    </div>
  );
}

interface ChartCardProps {
  title: string;
  subtitle: string;
  icon: string;
  children: ReactNode;
}

function ChartCard({ title, subtitle, icon, children }: ChartCardProps) {
  return (
    <section className="border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17] md:p-lg md:shadow-[8px_8px_0_0_#1d1c17]">
      <header className="mb-md flex items-start gap-sm border-b-4 border-on-background pb-sm">
        <span className="material-symbols-outlined text-3xl text-primary">{icon}</span>
        <div>
          <h3 className="font-headline text-lg font-bold uppercase leading-tight text-on-surface md:text-xl">
            {title}
          </h3>
          <p className="text-xs text-on-surface-variant md:text-sm">{subtitle}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

export function AdminDashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getAdminMetrics()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar las métricas globales.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const totals = data?.totals;

  return (
    <div className="flex min-h-screen flex-col bg-background font-body text-on-surface selection:bg-primary selection:text-on-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b-4 border-on-background bg-surface px-6 py-4 shadow-[0_4px_0_0_#1d1c17]">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border-4 border-on-background bg-primary shadow-[2px_2px_0_0_#1d1c17]">
            <span className="material-symbols-outlined text-3xl text-on-primary">admin_panel_settings</span>
          </div>
          <div>
            <h1 className="font-headline text-2xl font-black uppercase tracking-tight text-primary">
              AdaptaClassX
            </h1>
            <p className="text-sm font-bold tracking-wide text-on-surface-variant">
              Panel de Administración Global
            </p>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <div className="hidden flex-col items-end md:flex">
            <span className="font-headline font-bold">{user?.nombre || 'Administrador'}</span>
            <span className="text-xs uppercase text-on-surface-variant">{user?.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="group flex h-12 w-12 items-center justify-center border-4 border-on-background bg-surface-variant transition-all hover:bg-error hover:text-on-error"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined transition-transform group-hover:scale-110">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-lg p-6 md:p-12">
        <section className="border-b-4 border-on-background pb-md">
          <h2 className="font-headline text-3xl font-bold uppercase tracking-normal md:text-5xl">
            Métricas Globales
          </h2>
          <p className="mt-xs max-w-3xl text-sm leading-relaxed text-on-surface-variant md:text-lg">
            Salud y crecimiento de la plataforma: adopción de usuarios, volumen de uso y qué contenido tiene más éxito.
          </p>
        </section>

        {loading && (
          <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[8px_8px_0_0_#1d1c17]">
            <p className="font-headline text-2xl font-bold uppercase">Cargando métricas…</p>
          </div>
        )}

        {error && !loading && (
          <div className="border-4 border-on-background bg-error-container p-md font-bold text-on-error-container shadow-[8px_8px_0_0_#1d1c17]">
            {error}
          </div>
        )}

        {!loading && data && (
          <div className="space-y-lg">
            {/* KPI strip */}
            <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
              <Kpi
                label="Estudiantes"
                value={totals?.students ?? 0}
                icon="school"
                className="bg-primary-container text-on-primary-container"
              />
              <Kpi
                label="Profesores"
                value={totals?.teachers ?? 0}
                icon="badge"
                className="bg-secondary-container text-on-secondary-container"
              />
              <Kpi
                label="Partidas jugadas"
                value={totals?.sessions ?? 0}
                icon="sports_esports"
                className="bg-tertiary-container text-on-tertiary-container"
              />
              <Kpi
                label="Preguntas IA"
                value={totals?.questions ?? 0}
                icon="auto_awesome"
                className="bg-surface-container-high text-on-surface"
              />
            </div>

            {/* A — Growth (full width) */}
            <ChartCard
              title="Crecimiento y adopción"
              subtitle="Usuarios acumulados por mes, separados por rol."
              icon="trending_up"
            >
              <GrowthAreaChart data={data.crecimiento} />
            </ChartCard>

            {/* B + C side by side */}
            <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
              <ChartCard
                title="Volumen de actividad"
                subtitle="Partidas jugadas por mes en toda la plataforma."
                icon="bar_chart"
              >
                <ActivityBarChart data={data.actividad} />
              </ChartCard>

              <ChartCard
                title="Top juegos globales"
                subtitle="Minutos jugados por minijuego (todos los usuarios)."
                icon="emoji_events"
              >
                <TopGamesPieChart data={data.topJuegos} />
              </ChartCard>
            </div>

            {/* D — AI adoption (full width) */}
            <ChartCard
              title="Adopción de la IA por docentes"
              subtitle="Documentos subidos vs. preguntas generadas. Arriba a la derecha = power users."
              icon="smart_toy"
            >
              <AiAdoptionScatter data={data.iaAdopcion} />
            </ChartCard>
          </div>
        )}
      </main>
    </div>
  );
}
