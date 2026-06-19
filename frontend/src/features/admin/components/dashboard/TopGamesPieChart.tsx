import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TopJuegoRow } from '../../../teacher/services/dashboard.service';
import { INK, CHART_PALETTE, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';

function GamesTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as TopJuegoRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-headline text-sm font-bold uppercase text-on-surface">{row.titulo}</p>
      <p className="font-mono text-xs font-bold text-on-surface-variant">
        {row.minutos} min · {row.sesiones} {row.sesiones === 1 ? 'partida' : 'partidas'}
      </p>
    </TooltipShell>
  );
}

export function TopGamesPieChart({ data }: { data: TopJuegoRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no se ha jugado ningún minijuego." />;
  }
  const totalMin = data.reduce((acc, d) => acc + d.minutos, 0);

  return (
    <div className="flex flex-col items-center gap-md md:flex-row">
      <div style={{ width: 230, height: 230 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="minutos"
              nameKey="titulo"
              outerRadius={104}
              stroke={INK}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((row, i) => (
                <Cell key={row.titulo} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<GamesTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Custom blocky legend with the minute share */}
      <ul className="flex w-full flex-col gap-1">
        {data.map((row, i) => {
          const share = totalMin === 0 ? 0 : Math.round((row.minutos / totalMin) * 100);
          return (
            <li key={row.titulo} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-3 w-3 shrink-0 border-2 border-on-background"
                  style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
                />
                <span className="truncate font-bold text-on-surface">{row.titulo}</span>
              </span>
              <span className="shrink-0 font-mono text-xs font-bold text-on-surface-variant">
                {row.minutos} min · {share}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
