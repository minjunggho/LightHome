// Shared types for the live demo experience.
// These mirror the DecisionRecord contract (CONTRACTS.md) but are trimmed to
// what the frontend renders, so mock frames and live backend records share one shape.

export type Stage = "trust" | "isolation" | "desensitization" | "escalation";
export type AlertLevel = "none" | "watch" | "alert";
export type ScenarioId = "grooming" | "teen_relationship" | "friendly_adult";
export type View = "parent" | "tns";

export type StageProbabilities = Record<Stage, number>;

export const STAGES: Stage[] = [
  "trust",
  "isolation",
  "desensitization",
  "escalation",
];

export const STAGE_LABELS: Record<Stage, string> = {
  trust: "Trust",
  isolation: "Isolation",
  desensitization: "Desensitization",
  escalation: "Escalation",
};

export interface ConditionCheck {
  key: string;
  label: string;
  value: number;
  threshold: number;
  op: ">" | "<";
  met: boolean;
  display: string;
  thresholdDisplay: string;
}

export interface DemoMessage {
  turn: number;
  speaker: "A" | "B";
  display: string;
  role: "adult" | "minor" | "teen";
  text: string;
  t_offset_sec: number;
}

export interface DecisionFrame {
  turn: number;
  dominant_stage: Stage;
  prior_probabilities: StageProbabilities;
  stage_probabilities: StageProbabilities;
  /** Overall harmful mass, 0..1 — drives the risk progression chart. */
  risk: number;
  alert: { level: AlertLevel; fired: boolean };
  conditions: ConditionCheck[];
  features: {
    directionality: number;
    reciprocity: number;
    escalation_velocity: number;
    boundary_recycle: { detected: boolean; count: number };
  };
  rationale: string;
  guidance: string;
  /** Key-moment label rendered as a marker on the risk chart. */
  marker?: string;
  message: DemoMessage;
}

export interface Scenario {
  id: ScenarioId;
  caseId: string;
  title: string;
  summary: string;
  expectedOutcome: AlertLevel;
  participants: { A: DemoMessage["display"]; B: DemoMessage["display"] };
  frames: DecisionFrame[];
}
