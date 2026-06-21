// Contract B/C client — the only place the frontend knows the backend shape.
// Mirrors backend/app/models.py. Keep in sync with CONTRACTS.md.

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Stage = "trust" | "isolation" | "desensitization" | "escalation";
export type AlertLevel = "none" | "watch" | "alert";
export const STAGES: Stage[] = ["trust", "isolation", "desensitization", "escalation"];

export type StageProbabilities = Record<Stage, number>;

export interface AnalyzeRequest {
  session_id: string;
  turn: number;
  speaker: string;
  text: string;
  t_offset_sec: number;
}

// --- parent view (whitelist projection) ---
// `turn`, `timestamp`, `t_offset_sec` are timing/ordering METADATA the console
// uses to order the live stream and run analytics — never message content.
export interface ParentView {
  turn: number;
  dominant_stage: Stage;
  prior_probabilities: StageProbabilities;
  stage_probabilities: StageProbabilities;
  alert: { level: AlertLevel };
  guidance: string;
  timestamp: string;
  t_offset_sec: number;
}

// --- /sessions summary (one row per live monitored conversation) ---
export interface SessionSummary {
  session_id: string;
  turns: number;
  last_turn: number;
  alert_level: AlertLevel;
  updated: string;
}

// --- tns view (full DecisionRecord) ---
export interface AlertCondition {
  value: number;
  threshold: number;
  op: string;
  met: boolean;
}
export interface BoundaryRecycle {
  detected: boolean;
  count: number;
  avg_gap_turns: number;
}
export interface Features {
  directionality: number;
  disclosure_asymmetry: number;
  reciprocity: number;
  boundary_recycle: BoundaryRecycle;
  escalation_position: number;
  escalation_velocity: number;
}
export interface ClaudeBlock {
  stage_likelihoods: StageProbabilities;
  rationale: string;
  model: string;
  latency_ms: number;
}
export interface Alert {
  level: AlertLevel;
  fired: boolean;
  conditions: Record<string, AlertCondition>;
  reason: string;
}
export interface DecisionRecord {
  schema_version: number;
  session_id: string;
  turn: number;
  dominant_stage: Stage;
  prior_probabilities: StageProbabilities;
  stage_probabilities: StageProbabilities;
  features: Features;
  claude: ClaudeBlock;
  alert: Alert;
  guidance: string;
  raw_text: string;
  conversation_label: string | null;
  timestamp: string;
  t_offset_sec: number;
}

export type View = "parent" | "tns";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export function analyzeParent(req: AnalyzeRequest): Promise<ParentView> {
  return post<ParentView>("/analyze-message?view=parent", req);
}

export function analyzeTns(req: AnalyzeRequest): Promise<DecisionRecord> {
  return post<DecisionRecord>("/analyze-message?view=tns", req);
}

export function resetSession(sessionId: string): Promise<unknown> {
  return post("/session/reset", { session_id: sessionId });
}

// Live read path — the console is a read-only consumer of whatever is POSTing
// messages (the iMessage adapter, or the local test feed).
export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch(`${API_BASE}/sessions`);
  if (!res.ok) throw new Error(`sessions ${res.status}`);
  return res.json() as Promise<SessionSummary[]>;
}

export async function getSessionLatest(
  sessionId: string,
  view: View = "parent",
): Promise<ParentView | DecisionRecord | null> {
  const res = await fetch(
    `${API_BASE}/session/${encodeURIComponent(sessionId)}/latest?view=${view}`,
  );
  if (!res.ok) throw new Error(`latest ${res.status}`);
  const json = await res.json();
  return json && Object.keys(json).length ? json : null;
}

export async function getTranscript(
  sessionId: string,
  view: View = "tns",
): Promise<(DecisionRecord | ParentView)[]> {
  const res = await fetch(
    `${API_BASE}/session/${encodeURIComponent(sessionId)}/transcript?view=${view}`,
  );
  if (!res.ok) throw new Error(`transcript ${res.status}`);
  return res.json();
}

export async function health(): Promise<{ status: string; mode: string; version: string }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

// Live SSE stream (used for the "follow a live texting session" mode).
export function streamSession(
  sessionId: string,
  view: View,
  onRecord: (r: DecisionRecord | ParentView) => void,
): () => void {
  const es = new EventSource(
    `${API_BASE}/session/${encodeURIComponent(sessionId)}/stream?view=${view}`,
  );
  es.onmessage = (e) => {
    try {
      onRecord(JSON.parse(e.data));
    } catch {
      /* keep-alive lines */
    }
  };
  return () => es.close();
}
