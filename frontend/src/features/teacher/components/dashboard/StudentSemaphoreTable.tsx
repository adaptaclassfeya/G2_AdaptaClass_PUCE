import type { EstudianteRow } from '../../services/dashboard.service';
import { accuracyColor } from '../../../../lib/charts/chartTheme';
import { EmptyChart } from '../../../../lib/charts/chartUi';

// Short human label for the accuracy dot, so the color isn't the only signal
// (accessibility: don't rely on color alone).
function accuracyLabel(accuracy: number, intentos: number): string {
  if (intentos === 0) return 'Sin actividad';
  if (accuracy < 40) return 'En riesgo';
  if (accuracy < 70) return 'En proceso';
  return 'Sobresaliente';
}

export function StudentSemaphoreTable({ data }: { data: EstudianteRow[] }) {
  if (data.length === 0) {
    return <EmptyChart message="Este paralelo aún no tiene estudiantes inscritos." />;
  }

  return (
    <div className="overflow-x-auto border-4 border-on-background">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b-4 border-on-background bg-surface-container-high font-mono text-xs uppercase">
            <th className="p-sm font-bold">Estudiante</th>
            <th className="p-sm text-center font-bold">Racha</th>
            <th className="p-sm text-center font-bold">Intentos</th>
            <th className="p-sm text-center font-bold">Acierto</th>
            <th className="hidden p-sm font-bold sm:table-cell">Estado</th>
          </tr>
        </thead>
        <tbody>
          {data.map((s) => {
            const color = accuracyColor(s.accuracy);
            const noActivity = s.intentos === 0;
            return (
              <tr
                key={s.user_id}
                className="border-b-2 border-on-background/20 last:border-b-0 hover:bg-surface-container-low"
              >
                <td className="p-sm">
                  <span className="font-bold text-on-surface">{s.nombre}</span>
                  <span className="ml-2 font-mono text-xs text-on-surface-variant">{s.puntos_xp} XP</span>
                </td>
                <td className="p-sm text-center">
                  <span className="inline-flex items-center gap-1 font-bold">
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ color: s.racha_dias > 0 ? '#d89e00' : '#bec9c5' }}
                    >
                      local_fire_department
                    </span>
                    {s.racha_dias}
                  </span>
                </td>
                <td className="p-sm text-center font-mono font-bold text-on-surface">{s.intentos}</td>
                <td className="p-sm text-center">
                  <span className="inline-flex items-center gap-2 font-mono font-bold" style={{ color: noActivity ? '#6f7976' : color }}>
                    <span
                      className="inline-block h-3 w-3 shrink-0 border-2 border-on-background"
                      style={{ backgroundColor: noActivity ? '#bec9c5' : color }}
                    />
                    {noActivity ? '—' : `${s.accuracy}%`}
                  </span>
                </td>
                <td className="hidden p-sm sm:table-cell">
                  <span
                    className="border-2 border-on-background px-2 py-0.5 font-mono text-[10px] font-bold uppercase"
                    style={{ backgroundColor: noActivity ? '#e7e2da' : color, color: noActivity ? '#3f4946' : '#ffffff' }}
                  >
                    {accuracyLabel(s.accuracy, s.intentos)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
