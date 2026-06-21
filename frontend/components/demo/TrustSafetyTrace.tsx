"use client";

import { Check, X } from "lucide-react";

import type { ConditionCheck, DecisionFrame } from "@/lib/types";

function summary(frame: DecisionFrame, metCount: number, total: number) {
  if (frame.alert.fired) return `${metCount}/${total} conditions met → Alert fired`;
  if (frame.alert.level === "watch")
    return `${metCount}/${total} conditions met → Watch only`;
  return `${metCount}/${total} conditions met → No structural risk`;
}

/**
 * T&S explainability: each alert condition as a row showing value, threshold and
 * whether it is met — plus a plain-language summary of why the system did or did
 * not fire. This is the "show the reason, no hand-waving" panel.
 */
export function TrustSafetyTrace({ frame }: { frame: DecisionFrame }) {
  const conditions: ConditionCheck[] = frame.conditions;
  const metCount = conditions.filter((c) => c.met).length;
  const total = conditions.length;

  return (
    <div className="tnstrace">
      <ol className="tnstrace-list">
        {conditions.map((c) => (
          <li key={c.key} className={`tnstrace-row ${c.met ? "met" : "unmet"}`}>
            <span className="tnstrace-check">
              {c.met ? <Check size={13} /> : <X size={13} />}
            </span>
            <span className="tnstrace-label">{c.label}</span>
            <span className="tnstrace-values">
              <strong>{c.display}</strong>
              <em>vs {c.thresholdDisplay}</em>
            </span>
          </li>
        ))}
      </ol>

      <div className={`tnstrace-summary ${frame.alert.level}`}>
        <div className="tnstrace-meter" aria-hidden="true">
          <span style={{ width: `${(metCount / total) * 100}%` }} />
        </div>
        <strong>{summary(frame, metCount, total)}</strong>
      </div>

      {frame.rationale && (
        <p className="tnstrace-rationale">
          <span>Claude rationale</span>
          {frame.rationale}
        </p>
      )}
    </div>
  );
}
