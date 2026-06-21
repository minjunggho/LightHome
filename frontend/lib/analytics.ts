// Derived analytics — pure functions over the parent record history. Everything
// here is COMPUTED from the whitelisted parent fields (probabilities, dominant
// stage, alert level, timing). No message content involved. These are the real
// numbers the live console renders; nothing is faked or scripted.

import type { AlertLevel, ParentView, Stage, StageProbabilities } from "./api";
import { STAGES } from "./api";

/** Harmful mass — the probability concentrated in the three risk stages.
 *  This, not any single stage, is the headline risk number. */
export function harmfulMass(p: StageProbabilities): number {
  return p.isolation + p.desensitization + p.escalation;
}

/** Read confidence — how decisive the distribution is (1 = one stage owns all
 *  the mass, 0 = a flat four-way tie). 1 − normalized Shannon entropy. */
export function confidence(p: StageProbabilities): number {
  let h = 0;
  for (const s of STAGES) {
    const x = p[s];
    if (x > 0) h += -x * Math.log(x);
  }
  const hMax = Math.log(STAGES.length);
  return hMax === 0 ? 1 : Math.max(0, Math.min(1, 1 - h / hMax));
}

/** Risk velocity — change in harmful mass per message over the last `window`
 *  steps. The product thesis is about the *shift*, so this is the signal that
 *  matters more than the absolute level. Units: Δrisk per message. */
export function riskVelocity(series: number[], window = 3): number {
  if (series.length < 2) return 0;
  const endIdx = series.length - 1;
  const startIdx = Math.max(0, endIdx - window);
  const span = endIdx - startIdx;
  return span === 0 ? 0 : (series[endIdx] - series[startIdx]) / span;
}

/** The stage whose probability moved most between prior and posterior this turn
 *  — "what this message changed." Signed delta (+ rising, − falling). */
export function biggestMover(
  prior: StageProbabilities,
  posterior: StageProbabilities,
): { stage: Stage; delta: number } {
  let stage: Stage = "trust";
  let bestAbs = -1;
  let delta = 0;
  for (const s of STAGES) {
    const d = posterior[s] - prior[s];
    if (Math.abs(d) > bestAbs) {
      bestAbs = Math.abs(d);
      delta = d;
      stage = s;
    }
  }
  return { stage, delta };
}

export interface StageTransition {
  from: Stage;
  to: Stage;
  /** message turn at which the dominant stage flipped */
  turn: number;
  /** conversation-relative seconds at the flip */
  tOffsetSec: number;
  /** index into the record array */
  index: number;
}

/** Discrete dominant-stage transitions across the conversation. The Trust →
 *  Isolation flip is the whole product story — surface it as an event, not an
 *  implied bar change. */
export function transitions(records: ParentView[]): StageTransition[] {
  const out: StageTransition[] = [];
  for (let i = 1; i < records.length; i++) {
    const prev = records[i - 1].dominant_stage;
    const cur = records[i].dominant_stage;
    if (cur !== prev) {
      out.push({
        from: prev,
        to: cur,
        turn: records[i].turn,
        tOffsetSec: records[i].t_offset_sec,
        index: i,
      });
    }
  }
  return out;
}

/** Turns spent with each stage as the dominant read (dwell time, in messages). */
export function dwell(records: ParentView[]): Record<Stage, number> {
  const d: Record<Stage, number> = {
    trust: 0,
    isolation: 0,
    desensitization: 0,
    escalation: 0,
  };
  for (const r of records) d[r.dominant_stage] += 1;
  return d;
}

/** The turn/time at which the conversation first left Trust — "caught at minute
 *  N." Null while still in (or never having entered) Trust. */
export function firstShift(records: ParentView[]): StageTransition | null {
  const t = transitions(records);
  return t.find((x) => x.from === "trust") ?? t[0] ?? null;
}

/** The turn/time the alert first fired, if ever. */
export function firstAlert(records: ParentView[]): ParentView | null {
  return records.find((r) => r.alert.level === "alert") ?? null;
}

/** Highest alert level reached so far. */
export function peakLevel(records: ParentView[]): AlertLevel {
  let peak: AlertLevel = "none";
  const rank: Record<AlertLevel, number> = { none: 0, watch: 1, alert: 2 };
  for (const r of records) {
    if (rank[r.alert.level] > rank[peak]) peak = r.alert.level;
  }
  return peak;
}

/** mm:ss from conversation-relative seconds — the "minute 12 of 45" clock. */
export function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Compact relative-time label from an ISO timestamp ("3s ago", "2m ago"). */
export function formatAgo(iso: string, nowMs: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const sec = Math.max(0, Math.round((nowMs - then) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
