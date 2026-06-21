import type { ReactNode } from "react";

/* The live-analytics reading panel. One instrument divided into cells, like
   StatCard, but each cell can carry a trend (the change story) and a sublabel.
   The value stays high-contrast ink (projector-safe); tone rides the dot and
   the trend chip, never the number's color alone. */

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card md:grid-cols-4 md:divide-x">
      {children}
    </div>
  );
}

export type Trend = "up" | "down" | "flat";

export function Metric({
  label,
  value,
  unit,
  hint,
  accent,
  trend,
  trendLabel,
  trendTone,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  accent?: string;
  trend?: Trend;
  trendLabel?: string;
  /** color for the trend chip; defaults to ink-3 */
  trendTone?: string;
}) {
  return (
    <div className="border-line p-4 sm:p-5 [&:nth-child(2n)]:border-l md:[&:nth-child(n+2)]:border-l">
      <div className="flex items-center gap-1.5">
        {accent && (
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
        )}
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {label}
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="tabular text-[1.75rem] font-semibold leading-none tracking-tight text-ink">
          {value}
        </span>
        {unit && <span className="text-[13px] font-medium text-ink-3">{unit}</span>}
      </div>

      <div className="mt-1.5 flex min-h-[1rem] items-center gap-1.5">
        {trend && trendLabel && (
          <span
            className="inline-flex items-center gap-0.5 text-xs font-semibold"
            style={{ color: trendTone ?? "var(--ink-3)" }}
          >
            <TrendIcon trend={trend} />
            {trendLabel}
          </span>
        )}
        {hint && <span className="truncate text-xs text-ink-3">{hint}</span>}
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: Trend }) {
  if (trend === "flat") {
    return (
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  const up = trend === "up";
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d={up ? "M6 2.5 10 7H2z" : "M6 9.5 2 5h8z"}
        fill="currentColor"
      />
    </svg>
  );
}
