"use client";

import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";

import type { DemoPlayer } from "@/lib/useDemoPlayer";

type Tone = "light" | "dark";

const STATUS_TEXT: Record<DemoPlayer["backend"], string> = {
  checking: "Connecting to backend…",
  online: "Backend connected · live analysis",
  offline: "Backend not connected. Showing local demo preview.",
};

export function DemoControls({
  player,
  tone = "light",
}: {
  player: DemoPlayer;
  tone?: Tone;
}) {
  const { playing, toggle, next, reset, index, frames, atEnd, backend } = player;

  return (
    <div className={`demo-controls ${tone}`}>
      <div className="demo-buttons">
        <button
          type="button"
          className="demo-btn primary"
          onClick={toggle}
          aria-label={playing ? "Pause demo" : "Run demo"}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
          {playing ? "Pause" : atEnd ? "Replay demo" : "Run demo"}
        </button>
        <button
          type="button"
          className="demo-btn"
          onClick={next}
          disabled={atEnd}
          aria-label="Next message"
        >
          <SkipForward size={15} /> Next
        </button>
        <button
          type="button"
          className="demo-btn"
          onClick={reset}
          aria-label="Reset demo"
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>

      <div className="demo-meta">
        <div className="demo-progress" aria-label="Replay progress">
          <span>Turn</span>
          <strong>
            {index + 1}
            <i>/ {frames.length}</i>
          </strong>
        </div>
        <div className={`demo-status ${backend}`} role="status">
          <span className="demo-status-dot" />
          {STATUS_TEXT[backend]}
        </div>
      </div>
    </div>
  );
}
