// Thin client for the LightHome backend. Every call is best-effort: if the
// backend is not reachable the player falls back to local mock frames, so the
// demo never crashes and always looks complete.

import type {
  AlertLevel,
  ConditionCheck,
  DecisionFrame,
  DemoMessage,
  Stage,
  StageProbabilities,
  View,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Returns true if the backend host responds at all (any status counts). */
export async function probeBackend(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/`,
      { method: "GET", cache: "no-store" },
      2500,
    );
    return res.status > 0;
  } catch {
    return false;
  }
}

export async function resetSession(sessionId: string): Promise<void> {
  try {
    await fetchWithTimeout(
      `${API_BASE}/session/reset`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      },
      2500,
    );
  } catch {
    // ignore — caller is mock-first
  }
}

const STAGE_KEYS: Stage[] = [
  "trust",
  "isolation",
  "desensitization",
  "escalation",
];

function dominantStage(p: StageProbabilities): Stage {
  return STAGE_KEYS.reduce((a, b) => (p[b] > p[a] ? b : a));
}

function normalizeProbs(raw: unknown): StageProbabilities | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const out = {} as StageProbabilities;
  for (const key of STAGE_KEYS) {
    const v = obj[key];
    if (typeof v !== "number") return null;
    out[key] = v;
  }
  return out;
}

const CONDITION_LABELS: Record<string, string> = {
  harmful_mass: "Harmful mass",
  directionality: "Directionality",
  reciprocity: "Reciprocity",
  velocity: "Escalation velocity",
  escalation_velocity: "Escalation velocity",
  boundary_recycling: "Boundary recycling",
  boundary_recycle: "Boundary recycling",
};

function normalizeConditions(raw: unknown): ConditionCheck[] {
  if (!raw || typeof raw !== "object") return [];
  return Object.entries(raw as Record<string, Record<string, unknown>>).map(
    ([key, c]) => {
      const value = typeof c.value === "number" ? c.value : 0;
      const threshold = typeof c.threshold === "number" ? c.threshold : 0;
      const op = c.op === "<" ? "<" : ">";
      return {
        key,
        label: CONDITION_LABELS[key] ?? key,
        value,
        threshold,
        op,
        met: Boolean(c.met),
        display: value.toFixed(2),
        thresholdDisplay: `${op} ${threshold.toFixed(2)}`,
      };
    },
  );
}

/**
 * Sends one message to the backend and maps the returned DecisionRecord onto a
 * partial frame the components understand. Returns null on any failure so the
 * caller keeps the mock frame.
 */
export async function analyzeMessage(
  sessionId: string,
  message: DemoMessage,
  view: View,
): Promise<Partial<DecisionFrame> | null> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/analyze-message?view=${view}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          turn: message.turn,
          speaker: message.speaker,
          text: message.text,
          t_offset_sec: message.t_offset_sec,
        }),
      },
      5000,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;

    const probs = normalizeProbs(data.stage_probabilities);
    if (!probs) return null;
    const prior = normalizeProbs(data.prior_probabilities) ?? probs;

    const alertObj = (data.alert ?? {}) as Record<string, unknown>;
    const level: AlertLevel =
      alertObj.level === "alert"
        ? "alert"
        : alertObj.level === "watch"
          ? "watch"
          : "none";
    const conditions = normalizeConditions(alertObj.conditions);
    const harmful = conditions.find((c) => c.key === "harmful_mass");

    // Only set keys we actually have a value for, so spreading this partial
    // never overwrites a populated mock field with undefined.
    const partial: Partial<DecisionFrame> = {
      stage_probabilities: probs,
      prior_probabilities: prior,
      dominant_stage: (data.dominant_stage as Stage) ?? dominantStage(probs),
      alert: { level, fired: Boolean(alertObj.fired) || level === "alert" },
      risk:
        harmful?.value ??
        probs.isolation + probs.desensitization + probs.escalation,
    };

    if (typeof data.guidance === "string") partial.guidance = data.guidance;

    // tns view carries the explainable internals; parent view never does.
    if (view === "tns") {
      partial.conditions = conditions;
      const claude = (data.claude ?? {}) as Record<string, unknown>;
      if (typeof claude.rationale === "string") {
        partial.rationale = claude.rationale;
      }
    }
    return partial;
  } catch {
    return null;
  }
}
