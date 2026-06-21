"use client";

import { STAGES, STAGE_LABELS } from "@/lib/types";
import type { DecisionFrame } from "@/lib/types";

/**
 * Trust → Isolation → Desensitization → Escalation, with the current dominant
 * stage glowing and earlier stages marked as passed.
 */
export function StageTimeline({
  frame,
  tone = "light",
}: {
  frame: DecisionFrame;
  tone?: "light" | "dark";
}) {
  const activeIndex = STAGES.indexOf(frame.dominant_stage);
  const progress = STAGES.length > 1 ? activeIndex / (STAGES.length - 1) : 0;
  // The connector runs between the first and last node centres (each node sits
  // in the middle of its 1/4 column), i.e. across the inner 75% of the track.
  const fillWidth = 75 * progress;

  return (
    <div className={`stagetl ${tone}`}>
      <div className="stagetl-track">
        <span className="stagetl-fill" style={{ width: `${fillWidth}%` }} />
        <ol className="stagetl-nodes">
          {STAGES.map((stage, i) => {
            const state =
              i < activeIndex ? "passed" : i === activeIndex ? "active" : "ahead";
            return (
              <li key={stage} className={`stagetl-node ${state} ${stage}`}>
                <span className="stagetl-dot" />
                <span className="stagetl-label">{STAGE_LABELS[stage]}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
