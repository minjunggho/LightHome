import type { AlertLevel } from "@/lib/api";
import { ALERT_META } from "./theme";

/** A compact harmful-mass trace for a session card — the shape of the risk over
 *  the conversation at a glance. Tone follows the latest alert level. */
export function RiskSparkline({
  series,
  level,
  width = 96,
  height = 30,
}: {
  series: number[];
  level: AlertLevel;
  width?: number;
  height?: number;
}) {
  const tone = ALERT_META[level];

  if (series.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <line
          x1={0}
          y1={height - 2}
          x2={width}
          y2={height - 2}
          stroke="var(--line)"
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  const n = series.length;
  const pad = 2;
  const x = (i: number) => pad + (i / (n - 1)) * (width - 2 * pad);
  const y = (v: number) =>
    pad + (1 - Math.max(0, Math.min(1, v))) * (height - 2 * pad);

  const line = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `M${x(0)},${height} L${series
    .map((v, i) => `${x(i)},${y(v)}`)
    .join(" L")} L${x(n - 1)},${height} Z`;
  const lastX = x(n - 1);
  const lastY = y(series[n - 1]);

  return (
    <svg width={width} height={height} aria-hidden="true" className="overflow-visible">
      <path d={area} fill={tone.fill} fillOpacity={0.12} />
      <polyline
        points={line}
        fill="none"
        stroke={tone.fill}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={tone.fill} />
    </svg>
  );
}
