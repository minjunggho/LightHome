// Demo conversation loader. Scripts are served from /public/demos (copies of the
// repo's demo/*.json — Person 3's deliverable). Normalizes both demo schemas
// (Contract A and Person 3's id/expected_alert/timestamp_offset_seconds shape).

export interface DemoMessage {
  turn: number;
  speaker: string;
  text: string;
  t_offset_sec: number;
}

export interface DemoConversation {
  id: string;
  title: string;
  description: string;
  expectedAlert: boolean | null;
  messages: DemoMessage[];
}

export const DEMO_FILES = [
  { key: "grooming", file: "grooming_demo.json", label: "Grooming" },
  { key: "friendly", file: "normal_adult_demo.json", label: "Friendly adult" },
  { key: "teen", file: "teen_relationship_demo.json", label: "Teen relationship" },
] as const;

export type DemoKey = (typeof DEMO_FILES)[number]["key"];

interface RawMessage {
  turn: number;
  speaker: string;
  text: string;
  t_offset_sec?: number;
  timestamp_offset_seconds?: number;
}

export async function loadDemo(file: string): Promise<DemoConversation> {
  const res = await fetch(`/demos/${file}`);
  if (!res.ok) throw new Error(`failed to load demo ${file}`);
  const raw = await res.json();
  const messages: DemoMessage[] = (raw.messages as RawMessage[]).map((m) => ({
    turn: m.turn,
    speaker: m.speaker,
    text: m.text,
    t_offset_sec: m.t_offset_sec ?? m.timestamp_offset_seconds ?? 0,
  }));
  return {
    id: raw.id ?? raw.conversation_id ?? file,
    title: raw.title ?? file,
    description: raw.description ?? "",
    expectedAlert: "expected_alert" in raw ? Boolean(raw.expected_alert) : null,
    messages,
  };
}
