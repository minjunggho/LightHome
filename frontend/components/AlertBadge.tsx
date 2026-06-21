import type { AlertLevel } from "@/lib/api";
import { ALERT_META } from "./theme";

const COPY: Record<AlertLevel, string> = {
  none: "This chat looks normal",
  watch: "Some early warning signs",
  alert: "Grooming pattern detected",
};

export function AlertBadge({
  level,
  guidance,
}: {
  level: AlertLevel;
  guidance?: string;
}) {
  const m = ALERT_META[level];
  const fired = level === "alert";

  return (
    <div
      className="rounded-3xl p-5"
      style={{
        backgroundColor: m.bg,
        boxShadow: `inset 0 0 0 1px ${m.ring}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-full ${fired ? "lh-pulse" : ""}`}
          style={{ backgroundColor: m.fill, "--pulse": `${m.fill}` } as React.CSSProperties}
          aria-hidden="true"
        >
          {fired ? <BellIcon /> : <CheckIcon />}
        </span>
        <div>
          <div
            className="text-[11px] font-bold uppercase tracking-[0.12em]"
            style={{ color: m.text }}
          >
            {m.label}
          </div>
          <div className="text-[15px] font-semibold text-ink">{COPY[level]}</div>
        </div>
      </div>
      {guidance && (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-2">{guidance}</p>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
