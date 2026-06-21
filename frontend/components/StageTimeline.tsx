import type { AlertLevel, Stage, StageProbabilities } from "@/lib/api";
import { ALERT_META, STAGE_META, harmfulMass } from "./theme";

export interface TimelinePoint {
  turn: number;
  level: AlertLevel;
  dominant: Stage;
  posterior: StageProbabilities;
}

export function StageTimeline({ points }: { points: TimelinePoint[] }) {
  if (points.length === 0) {
    return (
      <div className="text-sm text-neutral-400">
        No messages yet — start the player to watch the arc.
      </div>
    );
  }

  const w = 100;
  const h = 40;
  const n = points.length;
  const coords = points.map((p, i) => {
    const x = n === 1 ? 0 : (i / (n - 1)) * w;
    const y = h - harmfulMass(p.posterior) * h;
    return `${x},${y}`;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <span className="text-xs uppercase tracking-wide text-neutral-500">
          Risk trajectory
        </span>
        <span className="text-xs text-neutral-400">{n} messages</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full">
        <polyline
          points={coords.join(" ")}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex flex-wrap gap-1.5">
        {points.map((p) => (
          <div
            key={p.turn}
            className="flex flex-col items-center"
            title={`turn ${p.turn} · ${STAGE_META[p.dominant].label} · ${ALERT_META[p.level].label}`}
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: ALERT_META[p.level].color }}
            />
            <span className="mt-0.5 text-[10px] tabular-nums text-neutral-400">
              {p.turn}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
