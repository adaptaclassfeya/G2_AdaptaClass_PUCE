// Pure (non-component) chart constants + helpers shared by the teacher and
// admin dashboards. Kept JSX-free and separate from chartUi.tsx so
// react-refresh's "only-export-components" rule stays happy (a file may not
// mix component and non-component exports).

// The Neo-Brutalist stroke (on-background). Every axis line, bar border and
// chart outline uses this so the charts read as blocky, not corporate-soft.
export const INK = '#1d1c17';

// Vivid, saturated palette for categorical charts (donut/pie slices, etc.).
// Pulled from the design tokens + the in-game accent colors so the charts
// feel native to the rest of the app.
export const CHART_PALETTE = [
  '#00473f', // primary teal
  '#93391d', // tertiary rust
  '#725475', // secondary purple
  '#d89e00', // gold
  '#1368ce', // blue
  '#b25133', // tertiary container
  '#26890c', // green
  '#e21b3c', // red
  '#006156', // primary container
  '#5b3a86', // deep violet
];

// Semaphore color by accuracy %: red below 40, amber 40–69, green 70+.
// Shared by the topic bars and the student table dots.
export function accuracyColor(accuracy: number): string {
  if (accuracy < 40) return '#ba1a1a';
  if (accuracy < 70) return '#c98a00';
  return '#1f7a34';
}

// Minimal shape of what Recharts injects into a custom Tooltip `content`.
// Typed narrowly so we never reach for `any` in chart components.
export interface RechartsTooltipItem {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

export interface RechartsTooltipProps {
  active?: boolean;
  payload?: RechartsTooltipItem[];
  label?: string | number;
}
