import type { ReactNode } from 'react';

// Hard-bordered tooltip card. Wrap any tooltip body in this so every chart
// shares the same blocky shell (no soft shadows, no rounded corners).
export function TooltipShell({ children }: { children: ReactNode }) {
  return (
    <div className="border-4 border-on-background bg-surface-container-lowest px-sm py-xs shadow-[4px_4px_0_0_#1d1c17]">
      {children}
    </div>
  );
}

// Placeholder shown inside a chart card when there's no data yet.
export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 border-4 border-dashed border-on-background/30 bg-surface-container-low p-md text-center">
      <span className="material-symbols-outlined text-4xl text-on-surface-variant">bar_chart_off</span>
      <p className="font-mono text-xs font-bold uppercase text-on-surface-variant">{message}</p>
    </div>
  );
}
