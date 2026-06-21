"use client";

import { useEffect, useRef } from "react";

import { mmss } from "@/lib/format";
import type { DecisionFrame } from "@/lib/types";

const LEVEL_DOT: Record<string, string> = {
  none: "clear",
  watch: "watch",
  alert: "alert",
};

/**
 * T&S-only message replay. Renders revealed messages as chat bubbles, fading
 * each new one in and highlighting the message currently under analysis.
 */
export function MessageReplayPanel({
  visible,
  currentTurn,
}: {
  visible: DecisionFrame[];
  currentTurn: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length]);

  return (
    <div className="replay" ref={scrollRef}>
      {visible.map((frame) => {
        const m = frame.message;
        const isCurrent = frame.turn === currentTurn;
        return (
          <article
            key={frame.turn}
            className={`replay-msg ${m.speaker === "A" ? "a" : "b"} ${
              isCurrent ? "current" : ""
            }`}
          >
            <div className="replay-meta">
              <span className="replay-who">{m.display}</span>
              <span className="replay-when">
                Turn {m.turn + 1} · {mmss(m.t_offset_sec)}
              </span>
            </div>
            <div className="replay-bubble">
              <p>{m.text}</p>
              {isCurrent && (
                <span className={`replay-flag ${LEVEL_DOT[frame.alert.level]}`}>
                  <i /> Analyzing
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
