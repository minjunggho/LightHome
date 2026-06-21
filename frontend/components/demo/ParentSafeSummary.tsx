"use client";

import { EyeOff } from "lucide-react";

import { STAGE_LABELS } from "@/lib/types";
import type { DecisionFrame } from "@/lib/types";
import { AlertStatusCard } from "./AlertStatusCard";
import { StageProbabilityBars } from "./StageProbabilityBars";
import { StageTimeline } from "./StageTimeline";

/**
 * The parent-safe projection: alert level, dominant stage, probability bars,
 * stage timeline and guidance — and nothing else. No raw messages, no feature
 * values, no rationale, no alert-condition internals.
 */
export function ParentSafeSummary({ frame }: { frame: DecisionFrame }) {
  return (
    <div className="parent-safe">
      <div className="parent-safe-badge">
        <EyeOff size={14} />
        Parent-safe view · No raw messages shown
      </div>

      <div className="parent-safe-grid">
        <AlertStatusCard level={frame.alert.level} guidance={frame.guidance} />

        <div className="dashboard-panel parent-safe-panel">
          <span className="dashboard-kicker">Dominant pattern</span>
          <h3 className="parent-safe-stage">{STAGE_LABELS[frame.dominant_stage]}</h3>
          <StageTimeline frame={frame} />
        </div>
      </div>

      <div className="dashboard-panel parent-safe-panel">
        <span className="dashboard-kicker">Stage probability</span>
        <StageProbabilityBars frame={frame} />
      </div>
    </div>
  );
}
