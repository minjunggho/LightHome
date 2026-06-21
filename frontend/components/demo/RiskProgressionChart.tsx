"use client";

import { pct } from "@/lib/format";
import type { DecisionFrame } from "@/lib/types";

const W = 720;
const H = 260;
const PAD = { left: 14, right: 18, top: 20, bottom: 30 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const WATCH = 0.5;
const ALERT = 0.75;

const THRESHOLDS = [
  { v: ALERT, label: "Alert", cls: "alert" },
  { v: WATCH, label: "Watch", cls: "watch" },
];

interface Props {
  /** Full scenario, used to fix the x-scale so the line grows left→right. */
  frames: DecisionFrame[];
  visible: DecisionFrame[];
  tone?: "light" | "dark";
}

export function RiskProgressionChart({ frames, visible, tone = "light" }: Props) {
  const total = frames.length;
  const denom = Math.max(1, total - 1);

  const x = (turn: number) => PAD.left + (turn / denom) * PLOT_W;
  const y = (risk: number) => PAD.top + (1 - clamp01(risk)) * PLOT_H;

  const pts = visible.map((f) => ({ x: x(f.turn), y: y(f.risk), f }));
  const line = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    pts.length > 0
      ? `M ${pts[0].x},${PAD.top + PLOT_H} L ${pts
          .map((p) => `${p.x},${p.y}`)
          .join(" L ")} L ${pts[pts.length - 1].x},${PAD.top + PLOT_H} Z`
      : "";

  const last = pts[pts.length - 1];
  const markers = visible.filter((f) => f.marker);

  return (
    <div className={`riskchart ${tone}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Overall risk rising over conversation turns"
      >
        <defs>
          <linearGradient id="risk-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.34" />
            <stop offset="100%" stopColor="var(--coral)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="risk-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--green)" />
            <stop offset="55%" stopColor="var(--amber)" />
            <stop offset="100%" stopColor="var(--coral)" />
          </linearGradient>
        </defs>

        {/* threshold guides */}
        {THRESHOLDS.map((t) => (
          <line
            key={t.label}
            className={`riskchart-threshold ${t.cls}`}
            x1={PAD.left}
            y1={y(t.v)}
            x2={W - PAD.right}
            y2={y(t.v)}
          />
        ))}

        {/* baseline */}
        <line
          className="riskchart-axis"
          x1={PAD.left}
          y1={PAD.top + PLOT_H}
          x2={W - PAD.right}
          y2={PAD.top + PLOT_H}
        />

        {area && <path className="riskchart-area" d={area} fill="url(#risk-area)" />}
        {pts.length > 1 && (
          <polyline className="riskchart-line" points={line} />
        )}

        {/* key-moment markers */}
        {markers.map((f) => (
          <g key={`m-${f.turn}`} className="riskchart-marker">
            <line x1={x(f.turn)} y1={y(f.risk)} x2={x(f.turn)} y2={PAD.top + PLOT_H} />
            <circle cx={x(f.turn)} cy={y(f.risk)} r={3.5} />
          </g>
        ))}

        {/* current point */}
        {last && (
          <g className="riskchart-head">
            <circle className="riskchart-head-halo" cx={last.x} cy={last.y} r={11} />
            <circle className="riskchart-head-dot" cx={last.x} cy={last.y} r={4.5} />
          </g>
        )}
      </svg>

      {/* threshold labels + marker captions, positioned over the plot */}
      <div className="riskchart-captions">
        {THRESHOLDS.map((t) => (
          <span
            key={t.label}
            className={`riskchart-threshold-label ${t.cls}`}
            style={{ top: `${(y(t.v) / H) * 100}%` }}
          >
            {t.label}
          </span>
        ))}
        {markers.map((f) => (
          <span
            key={`c-${f.turn}`}
            className="riskchart-caption"
            style={{
              // clamp so edge markers do not clip outside the panel
              left: `${Math.min(88, Math.max(12, (x(f.turn) / W) * 100))}%`,
              top: `${(y(f.risk) / H) * 100}%`,
            }}
          >
            {f.marker}
          </span>
        ))}
      </div>

      <div className="riskchart-foot">
        <span>Turn 1</span>
        <span className="riskchart-now">
          Overall risk <strong>{last ? pct(last.f.risk) : 0}%</strong>
        </span>
        <span>Turn {total}</span>
      </div>
    </div>
  );
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
