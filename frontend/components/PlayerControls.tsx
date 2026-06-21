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
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {DEMO_FILES.map((d) => (
          <button
            key={d.key}
            onClick={() => onSelect(d.file)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition ${
              activeFile === d.file
                ? "bg-neutral-900 text-white ring-neutral-900"
                : "bg-white text-neutral-700 ring-black/15 hover:bg-neutral-50"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={playing ? onPause : onPlay}
          disabled={!hasDemo || (atEnd && !playing)}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {playing ? "Pause" : atEnd ? "Played" : "Play"}
        </button>
        <button
          onClick={onStep}
          disabled={!hasDemo || atEnd || busy || playing}
          className="rounded-md px-3 py-2 text-sm font-medium ring-1 ring-black/15 hover:bg-neutral-50 disabled:opacity-40"
        >
          Next message
        </button>
        <button
          onClick={onReset}
          disabled={!hasDemo || sent === 0}
          className="rounded-md px-3 py-2 text-sm font-medium ring-1 ring-black/15 hover:bg-neutral-50 disabled:opacity-40"
        >
          Reset
        </button>
        {hasDemo && (
          <span className="ml-auto text-sm tabular-nums text-neutral-500">
            {sent} / {total}
          </span>
        )}
      </div>
    </div>
  );
}
