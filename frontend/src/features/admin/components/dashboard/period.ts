const MESES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

// 'YYYY-MM' → 'Mmm AA' (e.g. '2026-06' → 'Jun 26'). String-sliced, never
// parsed as a Date, so the UTC month the backend bucketed by stays intact.
export function formatMonth(periodo: string): string {
  const [year = '', month = ''] = periodo.split('-');
  const idx = Number(month) - 1;
  const m = MESES[idx] ?? month;
  return `${m} ${year.slice(2)}`;
}
