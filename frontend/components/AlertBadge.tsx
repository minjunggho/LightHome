import type { AlertLevel } from "@/lib/api";
import { ALERT_META } from "./theme";

export function AlertBadge({
  level,
  guidance,
}: {
  level: AlertLevel;
  guidance?: string;
}) {
  const m = ALERT_META[level];
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: m.bg, boxShadow: `inset 0 0 0 1px ${m.ring}` }}
    >
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-3.5 w-3.5 rounded-full"
          style={{ backgroundColor: m.color, boxShadow: `0 0 0 4px ${m.bg}` }}
        />
        <span
          className="text-lg font-semibold uppercase tracking-wide"
          style={{ color: m.color }}
        >
          {m.label}
        </span>
      </div>
      {guidance && <p className="mt-2 text-sm text-neutral-700">{guidance}</p>}
    </div>
  );
}
