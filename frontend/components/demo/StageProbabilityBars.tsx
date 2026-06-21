"use client";

import { pct } from "@/lib/format";
import { STAGES, STAGE_LABELS } from "@/lib/types";
import type { DecisionFrame } from "@/lib/types";

/**
 * Animated probability bars for the four stages. Widths transition smoothly as
 * the posterior updates each turn; the dominant stage is highlighted.
 */
export function StageProbabilityBars({
  frame,
  tone = "light",
}: {
  frame: DecisionFrame;
  tone?: "light" | "dark";
}) {
  return (
    <div className={`probbars ${tone}`}>
      {STAGES.map((stage) => {
        const value = frame.stage_probabilities[stage];
        const isDominant = frame.dominant_stage === stage;
        return (
          <div
            className={`probbar-row ${isDominant ? "dominant" : ""}`}
            key={stage}
          >
            <div className="probbar-head">
              <span>
                {STAGE_LABELS[stage]}
                {isDominant && <em>· dominant</em>}
              </span>
              <strong>{pct(value)}%</strong>
            </div>
            <div className="probbar-track">
              <span
                className={`probbar-fill ${stage}`}
                style={{ width: `${pct(value)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
