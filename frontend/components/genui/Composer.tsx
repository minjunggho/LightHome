"use client";

import { useRef, type KeyboardEvent } from "react";

/* The chat entry for the generative dashboard. A single soft rounded field that
   carries a live-data chip (how many conversations are attached as context),
   utility affordances, and a send control — the OpenUI-style prompt box, tuned
   to the soft-watch theme. */
export function Composer({
  value,
  onChange,
  onSubmit,
  dataCount,
  placeholder = "Summarize, chart, compare…",
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  dataCount: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSubmit();
    }
  };

  return (
    <div className="flex flex-col rounded-[1.75rem] border border-line bg-surface p-3.5 shadow-card transition-all duration-200 focus-within:border-line-strong focus-within:shadow-pop">
      {/* Prompt — a tall, multi-line field with the placeholder anchored top-left */}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className="block max-h-[40vh] min-h-[116px] w-full resize-none border-0 bg-transparent px-2 pt-1.5 text-[18px] leading-relaxed text-ink placeholder:italic placeholder:text-ink-3"
        style={{ fieldSizing: "content", outline: "none" } as React.CSSProperties}
      />

      {/* Control bar: attached context + tools on the left, model + send on the right */}
      <div className="mt-2 flex items-center justify-between gap-3 px-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[13px] font-semibold text-ink-2"
            title="Live detector data attached as context"
          >
            <LiveTag />
            {dataCount} conversation{dataCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <span className="hidden items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-2 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            Claude
          </span>
          <button
            onClick={() => value.trim() && onSubmit()}
            disabled={!value.trim()}
            aria-label="Generate dashboard"
            className="grid h-11 w-11 place-items-center rounded-full bg-ink text-surface transition-all duration-150 enabled:hover:scale-105 disabled:opacity-30"
          >
            <ArrowIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function LiveTag() {
  return (
    <span className="relative flex h-1.5 w-1.5">
      <span className="lh-blip inline-flex h-1.5 w-1.5 rounded-full bg-[oklch(0.66_0.11_168)]" />
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
