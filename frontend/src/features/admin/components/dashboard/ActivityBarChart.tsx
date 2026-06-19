import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActividadRow } from '../../../teacher/services/dashboard.service';
import { INK, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';
import { formatMonth } from './period';

const BAR = '#1368ce';

function ActivityTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as ActividadRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-mono text-xs font-bold uppercase text-on-surface">{formatMonth(row.periodo)}</p>
      <p className="text-sm font-bold" style={{ color: BAR }}>
        {row.sesiones} {row.sesiones === 1 ? 'partida' : 'partidas'}
      </p>
    </TooltipShell>
  );
}

export function ActivityBarChart({ data }: { data: ActividadRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no hay partidas registradas en la plataforma." />;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={INK} strokeOpacity={0.18} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="periodo"
            tickFormatter={formatMonth}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
            minTickGap={8}
          />
          <YAxis
            allowDecimals={false}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
            width={48}
          />
          <Tooltip cursor={{ fill: 'rgba(29,28,23,0.06)' }} content={<ActivityTooltip />} />
          <Bar dataKey="sesiones" fill={BAR} stroke={INK} strokeWidth={2} isAnimationActive={false} maxBarSize={64} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
