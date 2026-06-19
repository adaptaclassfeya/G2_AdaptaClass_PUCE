import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import type { IaAdopcionRow } from '../../../teacher/services/dashboard.service';
import { INK, CHART_PALETTE, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';

function AdoptionTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as IaAdopcionRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-headline text-sm font-bold uppercase text-on-surface">{row.nombre}</p>
      <p className="font-mono text-xs font-bold text-on-surface-variant">
        {row.documentos} {row.documentos === 1 ? 'documento' : 'documentos'} · {row.preguntas} preguntas
      </p>
    </TooltipShell>
  );
}

export function AiAdoptionScatter({ data }: { data: IaAdopcionRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no hay docentes registrados." />;
  }

  return (
    <div className="grid grid-cols-1 gap-lg lg:grid-cols-2">
      {/* Scatter: documents (x) vs questions (y). Power users sit top-right. */}
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: -8 }}>
            <CartesianGrid stroke={INK} strokeOpacity={0.18} strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="documentos"
              name="Documentos"
              allowDecimals={false}
              stroke={INK}
              tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
              axisLine={{ stroke: INK, strokeWidth: 2 }}
              tickLine={{ stroke: INK }}
              label={{
                value: 'Documentos subidos',
                position: 'insideBottom',
                offset: -12,
                fill: INK,
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <YAxis
              type="number"
              dataKey="preguntas"
              name="Preguntas"
              allowDecimals={false}
              stroke={INK}
              tick={{ fill: INK, fontWeight: 700, fontSize: 11 }}
              axisLine={{ stroke: INK, strokeWidth: 2 }}
              tickLine={{ stroke: INK }}
              width={48}
            />
            <ZAxis range={[120, 120]} />
            <Tooltip cursor={{ strokeDasharray: '3 3', stroke: INK }} content={<AdoptionTooltip />} />
            <Scatter data={data} isAnimationActive={false} stroke={INK} strokeWidth={2}>
              {data.map((row, i) => (
                <Cell key={row.teacher_id} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Power-user ranking (already sorted desc by the backend) */}
      <div className="overflow-x-auto border-4 border-on-background">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-4 border-on-background bg-surface-container-high font-mono text-xs uppercase">
              <th className="p-sm font-bold">#</th>
              <th className="p-sm font-bold">Docente</th>
              <th className="p-sm text-center font-bold">Docs</th>
              <th className="p-sm text-center font-bold">Preguntas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t, i) => (
              <tr
                key={t.teacher_id}
                className="border-b-2 border-on-background/20 last:border-b-0 hover:bg-surface-container-low"
              >
                <td className="p-sm">
                  <span
                    className="inline-block h-3 w-3 border-2 border-on-background"
                    style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                  />
                </td>
                <td className="p-sm font-bold text-on-surface">{t.nombre}</td>
                <td className="p-sm text-center font-mono font-bold text-on-surface">{t.documentos}</td>
                <td className="p-sm text-center font-mono font-bold text-primary">{t.preguntas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
