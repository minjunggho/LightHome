"use client";

import Link from "next/link";
import { ArrowUpRight, EyeOff, TrendingUp } from "lucide-react";

import { mmss } from "@/lib/format";
import { useDemoPlayer } from "@/lib/useDemoPlayer";
import { DemoControls } from "./DemoControls";
import { ParentSafeSummary } from "./ParentSafeSummary";
import { RiskProgressionChart } from "./RiskProgressionChart";
import { ScenarioSwitch } from "./ScenarioSwitch";

const STATE_TEXT = {
  none: "All clear",
  watch: "Watch — pattern shifting",
  alert: "Review recommended",
} as const;

export function ParentDemo() {
  const player = useDemoPlayer("parent");
  const { current, frames, visible, scenarioId, setScenario } = player;
  const level = current.alert.level;

  const delta = Math.round((current.risk - frames[0].risk) * 100);
  const dominantProb = current.stage_probabilities[current.dominant_stage];
  const confidence =
    dominantProb > 0.6 ? "High" : dominantProb > 0.45 ? "Moderate" : "Building";

  return (
    <section className="dashboard-shell dashboard-content">
      <div className="demo-bar">
        <ScenarioSwitch activeId={scenarioId} onSelect={setScenario} />
        <DemoControls player={player} />
      </div>

      <div className="status-strip">
        <div className="status-main">
          <span className={`status-light ${level === "none" ? "" : level}`} />
          <div>
            <small>Current state</small>
            <strong>{STATE_TEXT[level]}</strong>
          </div>
        </div>
        <div>
          <small>Conversation</small>
          <strong>Demo · fictional</strong>
        </div>
        <div>
          <small>Last analyzed</small>
          <strong>
            Turn {current.turn + 1} · {mmss(current.message.t_offset_sec)}
          </strong>
        </div>
        <div>
          <small>Confidence</small>
          <strong>{confidence}</strong>
        </div>
      </div>

      <section className="dashboard-panel progression-panel" aria-labelledby="risk-title">
        <div className="panel-title-row">
          <div>
            <span className="dashboard-kicker">Risk progression</span>
            <h2 id="risk-title">How the risk has moved over time.</h2>
          </div>
          <span className="trend-badge">
            <TrendingUp size={13} />
            {delta > 0 ? `+${delta} pts` : "stable"}
          </span>
        </div>
        <RiskProgressionChart frames={frames} visible={visible} />
      </section>

      <ParentSafeSummary frame={current} />

      <div className="privacy-note">
        <EyeOff size={19} />
        <p>
          <strong>No raw transcript is shown in this view.</strong> Stage
          movement and guidance only — moderators review full context in the
          trust-and-safety workspace.
        </p>
        <Link href="/platform">
          Open moderator view <ArrowUpRight size={15} />
        </Link>
      </div>
    </section>
  );
}
