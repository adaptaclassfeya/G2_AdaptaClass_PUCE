import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import type { TemaRow } from '../../services/dashboard.service';
import { INK, accuracyColor, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';

function TemaTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as TemaRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-headline text-sm font-bold uppercase text-on-surface">{row.tema}</p>
      <p className="text-sm font-bold" style={{ color: accuracyColor(row.accuracy) }}>
        {row.accuracy}% de acierto
      </p>
      <p className="font-mono text-xs text-on-surface-variant">
        {row.correctas}/{row.total} correctas
      </p>
    </TooltipShell>
  );
}

// Recharts' LabelFormatter/tickFormatter type the value as a broad ReactNode
// (string | number | null | undefined | boolean…), so accept that and coerce
// only the primitives we actually get (the accuracy number).
const labelFormatter = (value: ReactNode) =>
  `${typeof value === 'number' || typeof value === 'string' ? value : 0}%`;

export function TemaBarChart({ data }: { data: TemaRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no hay respuestas para medir temas." />;
  }
  // Grow the canvas with the number of topics so bars never get squashed.
  const height = Math.max(data.length * 52 + 24, 180);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 4, right: 52, bottom: 4, left: 8 }}
          barCategoryGap="22%"
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={labelFormatter}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 12 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={{ stroke: INK }}
          />
          <YAxis
            type="category"
            dataKey="tema"
            width={112}
            stroke={INK}
            tick={{ fill: INK, fontWeight: 700, fontSize: 12 }}
            axisLine={{ stroke: INK, strokeWidth: 2 }}
            tickLine={false}
          />
          <Tooltip cursor={{ fill: 'rgba(29,28,23,0.06)' }} content={<TemaTooltip />} wrapperStyle={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }} />
          <Bar dataKey="accuracy" stroke={INK} strokeWidth={2} isAnimationActive={false}>
            {data.map((row) => (
              <Cell key={row.tema} fill={accuracyColor(row.accuracy)} />
            ))}
            <LabelList
              dataKey="accuracy"
              position="right"
              formatter={labelFormatter}
              style={{ fill: INK, fontWeight: 700, fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
