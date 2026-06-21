"use client";

import { scenarioOrder, scenarios } from "@/lib/demoData";
import type { ScenarioId } from "@/lib/types";

const OUTCOME_DOT: Record<string, string> = {
  alert: "alert",
  watch: "watch",
  none: "clear",
};

/**
 * Lets the presenter switch between the three demo conversations. Styled
 * compactly (parent) or as a review queue (platform).
 */
export function ScenarioSwitch({
  activeId,
  onSelect,
  variant = "chips",
}: {
  activeId: ScenarioId;
  onSelect: (id: ScenarioId) => void;
  variant?: "chips" | "queue";
}) {
  if (variant === "queue") {
    return (
      <div className="queue-list scenario-queue">
        {scenarioOrder.map((id) => {
          const s = scenarios[id];
          return (
            <button
              key={id}
              type="button"
              className={`queue-item ${id === activeId ? "active" : ""}`}
              onClick={() => onSelect(id)}
            >
              <span className={`queue-status ${OUTCOME_DOT[s.expectedOutcome]}`} />
              <span>
                <strong>{s.caseId}</strong>
                <small>{s.title}</small>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="scenario-chips" role="tablist" aria-label="Demo conversation">
      {scenarioOrder.map((id) => {
        const s = scenarios[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={id === activeId}
            className={`scenario-chip ${id === activeId ? "active" : ""}`}
            onClick={() => onSelect(id)}
          >
            <span className={`scenario-chip-dot ${OUTCOME_DOT[s.expectedOutcome]}`} />
            {s.title}
          </button>
        );
      })}
    </div>
  );
}
