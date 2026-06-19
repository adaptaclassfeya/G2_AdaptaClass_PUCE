import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EvolucionRow } from '../../services/dashboard.service';
import { INK, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';

// YYYY-MM-DD → DD/MM. Slicing keeps it in the UTC calendar day the backend
// bucketed by (no Date parsing → no TZ drift).
function shortDate(fecha: string): string {
  const [, m, d] = fecha.split('-');
  return `${d}/${m}`;
}

function EvolutionTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as EvolucionRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-mono text-xs font-bold uppercase text-on-surface">{shortDate(row.fecha)}</p>
      <p className="text-sm font-bold text-primary">{row.accuracy}% de acierto</p>
      <p className="font-mono text-xs text-on-surface-variant">
        {row.correctas}/{row.total} respuestas
      </p>
    </TooltipShell>
  );
}

export function EvolutionLineChart({ data }: { data: EvolucionRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no hay actividad para graficar la evolución." />;
  }

  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={INK} strokeOpacity={0.18} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="fecha"
            tickFormatter={shortDate}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
            minTickGap={16}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
            width={48}
          />
          <Tooltip content={<EvolutionTooltip />} wrapperStyle={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }} />
          <Line
            type="monotone"
            dataKey="accuracy"
            stroke="#00473f"
            strokeWidth={3}
            isAnimationActive={false}
            dot={{ stroke: INK, strokeWidth: 2, r: 4, fill: '#d89e00' }}
            activeDot={{ stroke: INK, strokeWidth: 2, r: 6, fill: '#d89e00' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
