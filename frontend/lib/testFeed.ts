// Local test-traffic producer. This is a stand-in for the iMessage adapter
// (ingestion/photon) for when you don't have Photon credentials wired up: it
// replays a demo conversation by POSTing each message to /analyze-message,
// exactly as the real adapter does. The messages then flow through the real
// pipeline and the console reads them back over the live /sessions + /stream
// path — the dashboard cannot tell test traffic from a real iMessage thread,
// and renders identical, genuinely-computed analytics either way.
//
// It is NOT the canned in-page playback we replaced: nothing here renders, and
// the console never reads from this module. It only injects Contract-B traffic.

import { analyzeParent, resetSession } from "./api";
import { loadDemo } from "./demos";

export interface FeedSpec {
  /** demo file under /public/demos */
  file: string;
  /** neutral chat handle shown in the console (no verdict leaked) */
  handle: string;
}

// Three concurrent monitored "threads" — a realistic multi-conversation watch.
// Handles are deliberately neutral so the UI never telegraphs ground truth.
export const TEST_FEEDS: FeedSpec[] = [
  { file: "grooming_demo.json", handle: "Avery" },
  { file: "normal_adult_demo.json", handle: "Coach M." },
  { file: "teen_relationship_demo.json", handle: "Sam" },
];

export const sessionIdForHandle = (handle: string) =>
  `imessage:thread-${handle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export interface FeedController {
  stop: () => void;
  done: Promise<void>;
}

/** Replay one demo as live traffic into its session. Honors realtime pacing
 *  loosely (capped) so the console visibly fills, not all-at-once. */
export function startFeed(spec: FeedSpec, stepMs = 1600): FeedController {
  const sessionId = sessionIdForHandle(spec.handle);
  let stopped = false;

  const done = (async () => {
    const demo = await loadDemo(spec.file);
    await resetSession(sessionId);
    for (const m of demo.messages) {
      if (stopped) return;
      try {
        await analyzeParent({
          session_id: sessionId,
          turn: m.turn,
          speaker: m.speaker,
          text: m.text,
          t_offset_sec: m.t_offset_sec,
        });
      } catch {
        // Producer failures must never crash the console; skip and continue.
      }
      if (stopped) return;
      await new Promise((r) => setTimeout(r, stepMs));
    }
  })();

  return {
    stop: () => {
      stopped = true;
    },
    done,
  };
}

/** Launch all three monitored threads at once (staggered so they don't land in
 *  lockstep). Returns a single controller that stops every feed. */
export function startAllFeeds(stepMs = 1600): FeedController {
  const controllers: FeedController[] = [];
  TEST_FEEDS.forEach((spec, i) => {
    // stagger starts so the console looks like independent live conversations
    setTimeout(() => {
      if (!stopAll.stopped) controllers.push(startFeed(spec, stepMs));
    }, i * 600);
  });

  const stopAll = {
    stopped: false,
    stop: () => {
      stopAll.stopped = true;
      controllers.forEach((c) => c.stop());
    },
    done: Promise.resolve(),
  };
  return stopAll;
}
