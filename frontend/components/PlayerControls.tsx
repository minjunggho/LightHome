"use client";

import { DEMO_FILES } from "@/lib/demos";

export function PlayerControls({
  activeFile,
  playing,
  busy,
  atEnd,
  hasDemo,
  sent,
  total,
  onSelect,
  onStep,
  onPlay,
  onPause,
  onReset,
}: {
  activeFile: string | null;
  playing: boolean;
  busy: boolean;
  atEnd: boolean;
  hasDemo: boolean;
  sent: number;
  total: number;
  onSelect: (file: string) => void;
  onStep: () => void;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  const pct = total > 0 ? (sent / total) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Conversation selector */}
      <div className="flex flex-wrap gap-2">
        {DEMO_FILES.map((d) => {
          const active = activeFile === d.file;
          return (
            <button
              key={d.key}
              onClick={() => onSelect(d.file)}
              aria-pressed={active}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150 ${
                active
                  ? "bg-brand text-brand-fg"
                  : "bg-surface-2 text-ink-2 hover:bg-surface-3 hover:text-ink"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      {/* Transport */}
      <div className="flex items-center gap-2">
        <button
          onClick={playing ? onPause : onPlay}
          disabled={!hasDemo || (atEnd && !playing)}
          className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-30"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
          {playing ? "Pause" : atEnd ? "Replay" : sent > 0 ? "Resume" : "Play"}
        </button>
        <button
          onClick={onStep}
          disabled={!hasDemo || atEnd || busy || playing}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          Step
        </button>
        <button
          onClick={onReset}
          disabled={!hasDemo || sent === 0}
          className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
        >
          Reset
        </button>
        {hasDemo && (
          <span className="tabular ml-auto text-sm font-medium text-ink-2">
            {sent} <span className="text-ink-3">/ {total}</span>
          </span>
        )}
      </div>

      {/* Progress */}
      {hasDemo && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="4.5" width="4" height="15" rx="1" />
      <rect x="14" y="4.5" width="4" height="15" rx="1" />
    </svg>
  );
}
