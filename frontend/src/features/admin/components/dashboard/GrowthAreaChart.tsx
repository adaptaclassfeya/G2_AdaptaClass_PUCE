import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CrecimientoRow } from '../../../teacher/services/dashboard.service';
import { INK, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';
import { formatMonth } from './period';

const ESTUDIANTES = '#00473f';
const PROFESORES = '#d89e00';

function GrowthTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as CrecimientoRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-mono text-xs font-bold uppercase text-on-surface">{formatMonth(row.periodo)}</p>
      <p className="text-sm font-bold" style={{ color: ESTUDIANTES }}>
        {row.estudiantes} estudiantes
        <span className="font-mono text-xs text-on-surface-variant"> (+{row.nuevosEstudiantes})</span>
      </p>
      <p className="text-sm font-bold" style={{ color: '#8a6a00' }}>
        {row.profesores} profesores
        <span className="font-mono text-xs text-on-surface-variant"> (+{row.nuevosProfesores})</span>
      </p>
    </TooltipShell>
  );
}

export function GrowthAreaChart({ data }: { data: CrecimientoRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no hay usuarios registrados para graficar." />;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={INK} strokeOpacity={0.18} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="periodo"
            tickFormatter={formatMonth}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
            minTickGap={12}
          />
          <YAxis
            allowDecimals={false}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
            width={48}
          />
          <Tooltip content={<GrowthTooltip />} />
          {/* Stacked so the total area = all users; the split shows the mix. */}
          <Area
            type="monotone"
            dataKey="profesores"
            stackId="users"
            stroke={INK}
            strokeWidth={2}
            fill={PROFESORES}
            fillOpacity={0.85}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="estudiantes"
            stackId="users"
            stroke={INK}
            strokeWidth={2}
            fill={ESTUDIANTES}
            fillOpacity={0.85}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Blocky legend */}
      <div className="mt-sm flex items-center justify-center gap-md font-mono text-xs font-bold uppercase">
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border-2 border-on-background" style={{ backgroundColor: ESTUDIANTES }} />
          Estudiantes
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border-2 border-on-background" style={{ backgroundColor: PROFESORES }} />
          Profesores
        </span>
      </div>
    </div>
  );
}
