/**
 * Contract B client — the ONLY thing this adapter knows about the backend.
 * Mirrors backend/app/models.py::AnalyzeRequest. Keep in sync with CONTRACTS.md.
 */

export interface AnalyzeRequest {
  session_id: string;
  turn: number;
  speaker: string;
  text: string;
  t_offset_sec: number;
}

export async function analyzeMessage(
  backendUrl: string,
  req: AnalyzeRequest,
  view: "parent" | "tns",
): Promise<any> {
  const res = await fetch(`${backendUrl}/analyze-message?view=${view}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    throw new Error(`analyze-message ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function resetSession(
  backendUrl: string,
  sessionId: string,
): Promise<void> {
  const res = await fetch(`${backendUrl}/session/reset`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!res.ok) throw new Error(`session/reset ${res.status}`);
}
