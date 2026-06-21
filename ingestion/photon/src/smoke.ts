/**
 * Offline smoke test: replays synthetic iMessages through the SAME Contract-B
 * client the live adapter uses, against a running backend. Proves the
 * adapter -> backend round trip without needing Photon credentials.
 *
 * Usage: backend on :8000, then `npx tsx src/smoke.ts`
 */
import "dotenv/config";
import { analyzeMessage, resetSession, type AnalyzeRequest } from "./backendClient.js";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const session = "imessage:smoke-space-1";

const texts = [
  "hey! saw you like minecraft too",
  "what server do you play on?",
  "cool, you seem really mature for your age",
  "do your parents check your messages?",
  "let's keep this just between us ok",
];

async function main() {
  await resetSession(BACKEND_URL, session);
  for (let turn = 0; turn < texts.length; turn++) {
    const req: AnalyzeRequest = {
      session_id: session,
      turn,
      speaker: "imessage:+15555550123",
      text: texts[turn],
      t_offset_sec: turn * 30,
    };
    const rec = await analyzeMessage(BACKEND_URL, req, "tns");
    console.log(
      `turn ${turn}: alert=${rec.alert.level} dominant=${rec.dominant_stage} ` +
        `harm=${(rec.stage_probabilities.isolation + rec.stage_probabilities.desensitization + rec.stage_probabilities.escalation).toFixed(2)}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
