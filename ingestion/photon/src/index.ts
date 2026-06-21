/**
 * Photon/Spectrum -> Contract B adapter (OPTIONAL, off the critical demo path).
 *
 * This is a thin INGESTION adapter, not part of the detection pipeline. It reads
 * inbound iMessages from a Spectrum app and republishes each one as a Contract B
 * `AnalyzeRequest` to the backend's POST /analyze-message. The backend is
 * unchanged: a real iMessage and a replayed demo-JSON message look identical to it.
 *
 * SCOPE / SAFETY (see CLAUDE.md framing):
 *   - Intended for YOUR OWN linked iMessage account only. Do not point this at
 *     anyone else's messages, and never at a minor's.
 *   - PHOTON_DRY_RUN=true (default) logs what it WOULD send and posts nothing.
 *   - Inbound text only; outbound (your own) and non-text content are skipped.
 *   - Optional ALLOWED_SPACES allowlist restricts which conversations are read.
 *
 * Run:  cp .env.example .env && npm install && npm run dev
 */

import "dotenv/config";
import { Spectrum, type Message, type Space } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers";
import { analyzeMessage, type AnalyzeRequest } from "./backendClient.js";

// --- config ---------------------------------------------------------------
const PROJECT_ID = requireEnv("PROJECT_ID");
const PROJECT_SECRET = requireEnv("PROJECT_SECRET");
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const VIEW = (process.env.VIEW ?? "tns") as "parent" | "tns";
const DRY_RUN = (process.env.PHOTON_DRY_RUN ?? "true").toLowerCase() !== "false";
const ALLOWED_SPACES = (process.env.ALLOWED_SPACES ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Per-conversation turn counter + first-seen time, so we can build the
// `turn` and `t_offset_sec` fields the pipeline expects (Contract B).
const turns = new Map<string, number>();
const firstSeenMs = new Map<string, number>();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var ${name} (see .env.example)`);
  return v;
}

function toRequest(spaceId: string, senderId: string, text: string, ts: number): AnalyzeRequest {
  if (!firstSeenMs.has(spaceId)) firstSeenMs.set(spaceId, ts);
  const turn = turns.get(spaceId) ?? 0;
  turns.set(spaceId, turn + 1);

  return {
    session_id: `imessage:${spaceId}`,
    turn,
    speaker: senderId,
    text,
    t_offset_sec: Math.max(0, Math.floor((ts - firstSeenMs.get(spaceId)!) / 1000)),
  };
}

async function main() {
  console.log(
    `[photon-adapter] backend=${BACKEND_URL} view=${VIEW} dryRun=${DRY_RUN}` +
      (ALLOWED_SPACES.length ? ` allowedSpaces=${ALLOWED_SPACES.join(",")}` : ""),
  );

  const app = await Spectrum({
    projectId: PROJECT_ID,
    projectSecret: PROJECT_SECRET,
    providers: [imessage.config()],
  });

  for await (const [space, message] of app.messages as AsyncIterable<[Space, Message]>) {
    // iMessage only, inbound text only — never the user's own outbound messages.
    if (message.platform.toLowerCase() !== "imessage") continue;
    if (message.direction === "outbound") continue;
    if (message.content.type !== "text") continue;
    if (ALLOWED_SPACES.length && !ALLOWED_SPACES.includes(space.id)) continue;

    const senderId = message.sender?.id ?? "unknown";
    const req = toRequest(space.id, senderId, message.content.text, message.timestamp.getTime());

    if (DRY_RUN) {
      console.log(
        `[dry-run] would POST turn=${req.turn} session=${req.session_id} len=${req.text.length}`,
      );
      continue;
    }

    try {
      const record = await analyzeMessage(BACKEND_URL, req, VIEW);
      console.log(
        `[ok] turn=${req.turn} session=${req.session_id} alert=${record?.alert?.level ?? "?"}`,
      );
    } catch (err) {
      // Ingestion failures must never crash the detector; log and continue.
      console.error(`[err] turn=${req.turn} session=${req.session_id}:`, err);
    }
  }
}

main().catch((err) => {
  console.error("[photon-adapter] fatal:", err);
  process.exit(1);
});
