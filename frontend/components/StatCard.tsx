import type { ReactNode } from "react";

/* The readings sit in ONE soft instrument panel divided into cells. Each cell
   pairs an icon tile with a high-contrast number; tone rides the icon tint + a
   small label, never the number's color alone (projector- and AA-safe). */

export function StatGroup({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 divide-line overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:grid-cols-4 lg:divide-x">
      {children}
    </div>
  );
}

const ICONS: Record<string, ReactNode> = {
  status: (
    <path d="M20 6 9 17l-5-5" />
  ),
  stage: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  check: <path d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  monitored: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  risk: <path d="M3 17l6-6 4 4 8-8M21 7h-5M21 7v5" />,
};

export function StatCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  icon?: keyof typeof ICONS | string;
}) {
  return (
    <div className="flex items-center gap-4 border-line p-5 [&:nth-child(2)]:border-l lg:[&:nth-child(n+2)]:border-l">
      {icon && ICONS[icon] && (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[icon]}
          </svg>
        </span>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          {accent && (
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden="true"
            />
          )}
          <span className="truncate text-[12.5px] font-medium text-ink-3">{label}</span>
        </div>
        <div className="tabular mt-1 truncate text-[1.6rem] font-bold leading-none tracking-tight text-ink">
          {value}
        </div>
        {hint && <div className="mt-1.5 truncate text-xs text-ink-3">{hint}</div>}
      </div>
    </div>
  );
}
