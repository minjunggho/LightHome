"use client";

import { CircleAlert, CircleCheck, CircleDot, ShieldCheck } from "lucide-react";

import { scenarios } from "@/lib/demoData";
import { useDemoPlayer } from "@/lib/useDemoPlayer";
import { AlertStatusCard } from "./AlertStatusCard";
import { DemoControls } from "./DemoControls";
import { MessageReplayPanel } from "./MessageReplayPanel";
import { RiskProgressionChart } from "./RiskProgressionChart";
import { ScenarioSwitch } from "./ScenarioSwitch";
import { StageProbabilityBars } from "./StageProbabilityBars";
import { StageTimeline } from "./StageTimeline";
import { TrustSafetyTrace } from "./TrustSafetyTrace";

const BADGE = {
  none: { text: "No structural risk", Icon: CircleCheck },
  watch: { text: "Watch — pattern shifting", Icon: CircleDot },
  alert: { text: "Review recommended", Icon: CircleAlert },
} as const;

export function PlatformDemo() {
  const player = useDemoPlayer("tns");
  const { current, frames, visible, scenarioId, setScenario } = player;
  const scenario = scenarios[scenarioId];
  const level = current.alert.level;
  const badge = BADGE[level];
  const f = current.features;

  return (
    <>
      <section className="moderation-grid">
        <aside className="queue-panel">
          <div className="queue-header">
            <div>
              <span>Demo conversations</span>
              <strong>3 fictional cases</strong>
            </div>
          </div>
          <ScenarioSwitch
            activeId={scenarioId}
            onSelect={setScenario}
            variant="queue"
          />
          <div className="queue-foot">
            <ShieldCheck size={14} />
            Switch cases to compare why one fires and two stay green.
          </div>
        </aside>

        <section className="transcript-panel" aria-labelledby="case-title">
          <div className="case-header">
            <div>
              <span className="case-label">
                Case {scenario.caseId} · Fictional demo
              </span>
              <h2 id="case-title">{scenario.title} review</h2>
              <p>{scenario.summary}</p>
            </div>
            <span className={`alert-badge ${level}`}>
              <badge.Icon size={15} /> {badge.text}
            </span>
          </div>

          <div className="transcript-controls">
            <DemoControls player={player} />
          </div>

          <MessageReplayPanel visible={visible} currentTurn={current.turn} />
        </section>

        <aside className="decomposition-panel">
          <div className="decomp-header">
            <div>
              <span>Decision trace</span>
              <strong>Turn {current.turn + 1}</strong>
            </div>
            <ShieldCheck size={20} />
          </div>

          <div className="decomp-scroll">
            <section className="decomp-section">
              <AlertStatusCard level={level} compact />
            </section>

            <section className="decomp-section">
              <h3>Stage probabilities</h3>
              <StageProbabilityBars frame={current} />
            </section>

            <section className="decomp-section">
              <h3>Stage timeline</h3>
              <StageTimeline frame={current} />
            </section>

            <section className="decomp-section">
              <h3>Raw features</h3>
              <dl className="feature-table">
                <div>
                  <dt>Directionality</dt>
                  <dd>{f.directionality.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Reciprocity</dt>
                  <dd>{f.reciprocity.toFixed(2)}</dd>
                </div>
                <div>
                  <dt>Boundary recycle</dt>
                  <dd>{f.boundary_recycle.count}</dd>
                </div>
                <div>
                  <dt>Escalation velocity</dt>
                  <dd>{f.escalation_velocity.toFixed(2)}</dd>
                </div>
              </dl>
            </section>

            <section className="decomp-section">
              <h3>Alert conditions</h3>
              <TrustSafetyTrace frame={current} />
            </section>
          </div>
        </aside>
      </section>

      <section className="riskstrip">
        <div className="riskstrip-head">
          <div>
            <span className="dashboard-kicker light">Risk progression</span>
            <h2>Harmful mass over the conversation.</h2>
          </div>
          <p>
            The line rises only as independent structural signals accumulate —
            flat when they do not.
          </p>
        </div>
        <RiskProgressionChart frames={frames} visible={visible} tone="dark" />
      </section>
    </>
  );
}
