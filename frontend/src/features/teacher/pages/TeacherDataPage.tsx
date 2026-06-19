import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { TeacherShell } from '../components/TeacherShell';
import { getApiErrorMessage } from '../../../lib/httpErrors';
import {
  dashboardService,
  type TeacherDashboardData,
} from '../services/dashboard.service';
import { TemaBarChart } from '../components/dashboard/TemaBarChart';
import { EvolutionLineChart } from '../components/dashboard/EvolutionLineChart';
import { GamesDonutChart } from '../components/dashboard/GamesDonutChart';
import { StudentSemaphoreTable } from '../components/dashboard/StudentSemaphoreTable';

// "Todos mis estudiantes" sentinel for the scope filter.
const ALL = '';

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
  className?: string;
}

function ChartCard({ title, subtitle, icon, children, className = '' }: ChartCardProps) {
  return (
    <section
      className={`border-4 border-on-background bg-surface-container-lowest p-md shadow-[6px_6px_0_0_#1d1c17] md:p-lg md:shadow-[8px_8px_0_0_#1d1c17] ${className}`}
    >
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

export function TeacherDataPage() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paraleloId, setParaleloId] = useState<string>(ALL);

  // Fetch on mount and whenever the scope changes. The synchronous "show the
  // loading flag" setState lives in the change handler (not here) so this
  // effect never calls setState synchronously — only inside async callbacks.
  useEffect(() => {
    let cancelled = false;
    dashboardService
      .getTeacherMetrics(paraleloId || undefined)
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'No se pudieron cargar las métricas.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [paraleloId]);

  // Changing the scope keeps the current charts on screen and dims them
  // (refreshing) instead of flashing the full skeleton.
  const handleScopeChange = (id: string) => {
    if (id === paraleloId) return;
    setRefreshing(true);
    setError(null);
    setParaleloId(id);
  };

  const paralelos = data?.scope.paralelos ?? [];
  const totals = data?.totals;

  return (
    <TeacherShell title="Datos">
      <section className="mb-lg flex flex-col justify-between gap-md border-b-4 border-on-background pb-md md:flex-row md:items-end">
        <div>
          <h2 className="font-headline text-2xl font-bold uppercase tracking-normal md:text-4xl">
            Métricas de aula
          </h2>
          <p className="mt-xs text-sm leading-relaxed text-on-surface-variant md:text-base">
            Qué temas reforzar, cómo evoluciona la clase y quién necesita apoyo.
          </p>
        </div>

        {/* Paralelo scope filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="scope" className="font-mono text-[10px] font-bold uppercase text-on-surface-variant">
            Paralelo
          </label>
          <select
            id="scope"
            value={paraleloId}
            onChange={(e) => handleScopeChange(e.target.value)}
            disabled={loading}
            className="border-4 border-on-background bg-surface p-sm font-bold uppercase outline-none focus:border-primary disabled:opacity-50"
          >
            <option value={ALL}>Todos mis estudiantes</option>
            {paralelos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} · {p.grado}º
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading && (
        <div className="border-4 border-on-background bg-surface-container-lowest p-lg text-center shadow-[8px_8px_0_0_#1d1c17]">
          <p className="font-headline text-2xl font-bold uppercase">Cargando métricas…</p>
        </div>
      )}

      {error && !loading && (
        <div className="mb-md border-4 border-on-background bg-error-container p-md font-bold text-on-error-container shadow-[8px_8px_0_0_#1d1c17]">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className={`space-y-lg transition-opacity ${refreshing ? 'opacity-50' : 'opacity-100'}`}>
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-md lg:grid-cols-4">
            <Kpi
              label="Estudiantes"
              value={totals?.students ?? 0}
              icon="group"
              className="bg-primary-container text-on-primary-container"
            />
            <Kpi
              label="Respuestas"
              value={totals?.attempts ?? 0}
              icon="quiz"
              className="bg-secondary-container text-on-secondary-container"
            />
            <Kpi
              label="Acierto global"
              value={`${totals?.accuracy ?? 0}%`}
              icon="target"
              className="bg-tertiary-container text-on-tertiary-container"
            />
            <Kpi
              label="Minutos jugados"
              value={totals?.minutes ?? 0}
              icon="timer"
              className="bg-surface-container-high text-on-surface"
            />
          </div>

          {/* A + C side by side on large screens */}
          <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
            <ChartCard
              title="Desempeño por tema"
              subtitle="Porcentaje de acierto por tema (el más bajo arriba)."
              icon="leaderboard"
            >
              <TemaBarChart data={data.porTema} />
            </ChartCard>

            <ChartCard
              title="Minijuegos favoritos"
              subtitle="Partidas jugadas por minijuego."
              icon="sports_esports"
            >
              <GamesDonutChart data={data.minijuegos} />
            </ChartCard>
          </div>

          {/* B full width */}
          <ChartCard
            title="Evolución de la clase"
            subtitle="Acierto global por día (últimos 30 días con actividad)."
            icon="trending_up"
          >
            <EvolutionLineChart data={data.evolucion} />
          </ChartCard>

          {/* D full width */}
          <ChartCard
            title="Semáforo de estudiantes"
            subtitle="Identifica alumnos destacados y en riesgo de un vistazo."
            icon="emoji_flags"
          >
            <StudentSemaphoreTable data={data.estudiantes} />
          </ChartCard>
        </div>
      )}
    </TeacherShell>
  );
}
