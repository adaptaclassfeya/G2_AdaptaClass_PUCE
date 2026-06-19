import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { MinijuegoRow } from '../../services/dashboard.service';
import { INK, CHART_PALETTE, type RechartsTooltipProps } from '../../../../lib/charts/chartTheme';
import { EmptyChart, TooltipShell } from '../../../../lib/charts/chartUi';

function GamesTooltip({ active, payload }: RechartsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as MinijuegoRow | undefined;
  if (!row) return null;
  return (
    <TooltipShell>
      <p className="mb-1 font-headline text-sm font-bold uppercase text-on-surface">{row.titulo}</p>
      <p className="font-mono text-xs font-bold text-on-surface-variant">
        {row.sesiones} {row.sesiones === 1 ? 'partida' : 'partidas'} · {row.minutos} min
      </p>
    </TooltipShell>
  );
}

export function GamesDonutChart({ data }: { data: MinijuegoRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Aún no se ha jugado ningún minijuego." />;
  }
  const totalSesiones = data.reduce((acc, d) => acc + d.sesiones, 0);

  return (
    <div className="flex flex-col items-center gap-md md:flex-row">
      <div className="relative shrink-0" style={{ width: 160, height: 160 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="sesiones"
              nameKey="titulo"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
              stroke={INK}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((row, i) => (
                <Cell key={row.titulo} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<GamesTooltip />} wrapperStyle={{ background: 'none', border: 'none', padding: 0, boxShadow: 'none' }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-headline text-2xl font-bold text-on-surface">{totalSesiones}</span>
          <span className="font-mono text-[9px] font-bold uppercase text-on-surface-variant">partidas</span>
        </div>
      </div>

      {/* Custom blocky legend */}
      <ul className="flex w-full flex-col gap-1">
        {data.map((row, i) => (
          <li key={row.titulo} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 border-2 border-on-background"
                style={{ backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length] }}
              />
              <span className="truncate font-bold text-on-surface">{row.titulo}</span>
            </span>
            <span className="shrink-0 font-mono text-xs font-bold text-on-surface-variant">
              {row.sesiones}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
