"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks a summary of the current dashboard answer back to the user.
 *
 * Posts the question + answer to /api/voice-summary (Claude condenses it, then
 * Deepgram Aura voices it) and plays the returned audio through a real <audio>
 * element. Each new answer is read aloud automatically once; the button replays
 * or stops it. If the browser blocks autoplay, it falls back to a manual click.
 */
export function VoiceSummaryButton({
  question,
  answer,
  disabled = false,
  autoPlay = true,
}: {
  question: string;
  answer: string;
  disabled?: boolean;
  autoPlay?: boolean;
}) {
  const [state, setState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const [summary, setSummary] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  // The answer we've already auto-played, so we read each one back only once.
  const playedForRef = useRef<string>("");

  const revoke = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setState("idle");
  }, []);

  const fetchAndPlay = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/voice-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answer }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Failed (${res.status})`);
      }
      const header = res.headers.get("X-Summary-Text");
      if (header) setSummary(decodeURIComponent(header));

      const blob = await res.blob();
      revoke();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = audioRef.current;
      if (!audio) {
        setState("error");
        return;
      }
      audio.src = url;
      audio.onended = () => setState("idle");
      audio.onerror = () => setState("error");
      try {
        await audio.play();
        setState("playing");
      } catch {
        // Autoplay blocked (no user activation yet) — leave the button so the
        // user can start it with a direct click.
        setState("idle");
      }
    } catch {
      setState("error");
    }
  }, [question, answer, revoke]);

  // Read each freshly-generated answer aloud once.
  useEffect(() => {
    if (!autoPlay || disabled) return;
    const a = answer.trim();
    if (!a || a === playedForRef.current) return;
    playedForRef.current = a;
    void fetchAndPlay();
  }, [answer, disabled, autoPlay, fetchAndPlay]);

  // Stop + free the blob on unmount.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      revoke();
    },
    [revoke],
  );

  const onClick = () => {
    if (state === "playing") stop();
    else void fetchAndPlay();
  };

  const label =
    state === "loading"
      ? "Summarizing…"
      : state === "playing"
        ? "Stop"
        : state === "error"
          ? "Retry summary"
          : "Play voice summary";

  return (
    <>
      <audio ref={audioRef} hidden preload="none" />
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === "loading" || !answer.trim()}
        title={summary ?? "Hear a spoken summary of this answer"}
        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-ink-2 shadow-card transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-40"
      >
        {state === "loading" ? (
          <Spinner />
        ) : state === "playing" ? (
          <WaveIcon />
        ) : (
          <SpeakerIcon />
        )}
        {label}
      </button>
    </>
  );
}

function SpeakerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M4 10v4M8 6v12M12 9v6M16 4v16M20 10v4" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
