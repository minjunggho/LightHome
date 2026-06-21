import type { AlertLevel, Stage, StageProbabilities } from "@/lib/api";
import { ALERT_META, STAGE_META, harmfulMass } from "./theme";

export interface TimelinePoint {
  turn: number;
  level: AlertLevel;
  dominant: Stage;
  posterior: StageProbabilities;
}

/* The risk trajectory — harmful mass (isolation + desensitization + escalation)
   over the conversation. This is the "we catch it at minute 12" moment: the line
   climbs, and the marker shows the exact message where the alert fired. */
export function StageTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-3">
        No messages yet.
      </p>
    );
  }

  const n = points.length;
  const xAt = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const yAt = (mass: number) => (1 - Math.max(0, Math.min(1, mass))) * 100;

  const xy = points.map((p, i) => ({ x: xAt(i), y: yAt(harmfulMass(p.posterior)) }));
  const line = xy.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `M0,100 L${xy.map((c) => `${c.x},${c.y}`).join(" L")} L100,100 Z`;

  const firstAlert = points.findIndex((p) => p.level === "alert");
  const fired = firstAlert >= 0;
  const latest = points[n - 1];
  const latestTone = ALERT_META[latest.level];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">How risk changed over time</h3>
        <span className="text-xs text-ink-3">
          risk level · {n} message{n === 1 ? "" : "s"}
        </span>
      </div>

      <div className="relative">
        {/* y reference labels */}
        <div className="pointer-events-none absolute -left-0.5 top-0 z-10 flex h-[160px] flex-col justify-between py-1 text-[10px] tabular text-ink-3">
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>

        <div className="relative ml-8 h-[160px] overflow-hidden rounded-2xl border border-line bg-surface-2">
          {/* gridlines */}
          <div className="absolute inset-0">
            <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-line" />
          </div>

          {/* current-risk readout (dark tooltip flavor) */}
          <div className="absolute right-2.5 top-2.5 z-30 flex items-center gap-2 rounded-xl bg-rail px-2.5 py-1.5 text-rail-fg shadow-pop">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: latestTone.fill }}
              aria-hidden="true"
            />
            <span className="tabular text-[13px] font-semibold">
              {Math.round(harmfulMass(latest.posterior) * 100)}%
            </span>
            <span className="text-[11px] text-rail-muted">{latestTone.label}</span>
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="lh-risk-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={latestTone.fill} stopOpacity="0.28" />
                <stop offset="100%" stopColor={latestTone.fill} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#lh-risk-fill)" />
            {n > 1 && (
              <polyline
                points={line}
                fill="none"
                stroke={latestTone.fill}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className="lh-draw"
                style={{ "--dash": 600 } as React.CSSProperties}
              />
            )}
          </svg>

          {/* alert marker */}
          {fired && (
            <div
              className="absolute bottom-0 top-0 z-20 w-px bg-[oklch(0.58_0.21_26)]"
              style={{ left: `${xAt(firstAlert)}%` }}
            >
              <span className="absolute -top-px left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[oklch(0.58_0.21_26)] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                Alert · msg {points[firstAlert].turn}
              </span>
            </div>
          )}

          {/* points */}
          {points.map((p, i) => {
            const isLast = i === n - 1;
            const tone = ALERT_META[p.level];
            return (
              <span
                key={p.turn}
                className="absolute z-30 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-all"
                style={{
                  left: `${xy[i].x}%`,
                  top: `${xy[i].y}%`,
                  width: isLast ? 12 : 7,
                  height: isLast ? 12 : 7,
                  backgroundColor: tone.fill,
                  boxShadow: isLast ? `0 0 0 4px ${tone.bg}` : undefined,
                }}
                title={`message ${p.turn} · ${STAGE_META[p.dominant].label} · ${tone.label} · ${Math.round(
                  harmfulMass(p.posterior) * 100,
                )}% risk`}
              />
            );
          })}
        </div>

        {/* x axis */}
        <div className="ml-8 mt-1.5 flex justify-between text-[10px] tabular text-ink-3">
          <span>msg 1</span>
          {n > 2 && <span>msg {points[Math.floor((n - 1) / 2)].turn}</span>}
          <span>msg {latest.turn}</span>
        </div>
      </div>
    </div>
  );
}
