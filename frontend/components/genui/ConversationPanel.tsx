"use client";

import { useState, type KeyboardEvent } from "react";

import type { GenMessage } from "@/lib/openui/store";

/* The right-rail conversation log for the generative dashboard. User prompts and
   the model's prose (openui-lang stripped out) thread top to bottom; a compact
   composer at the bottom handles follow-up edits. */
export function ConversationPanel({
  messages,
  streamingText,
  isStreaming,
  onSubmit,
}: {
  messages: GenMessage[];
  streamingText: string;
  isStreaming: boolean;
  onSubmit: (text: string) => void;
}) {
  const [draft, setDraft] = useState("");

  const send = () => {
    if (!draft.trim() || isStreaming) return;
    onSubmit(draft.trim());
    setDraft("");
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-6 py-5">
        <h2 className="text-[15px] font-semibold text-ink">Conversation</h2>
        <p className="mt-0.5 text-xs text-ink-3">Generated with Claude · via OpenUI</p>
      </div>

      <ol className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <li key={i} className="lh-rise flex">
              <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2 text-[13.5px] leading-relaxed text-brand-fg">
                {m.content}
              </div>
            </li>
          ) : m.text ? (
            <li key={i} className="lh-rise">
              <div className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2 text-[13.5px] leading-relaxed text-ink-2">
                {m.text}
              </div>
            </li>
          ) : (
            <li key={i} className="lh-rise text-[12px] font-medium text-ink-3">
              ✓ dashboard updated
            </li>
          ),
        )}
        {isStreaming && (
          <li className="text-[13px] text-ink-3">
            {streamingText || (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-[2px] border-line-strong border-t-brand" />
                building…
              </span>
            )}
          </li>
        )}
      </ol>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-1.5 focus-within:border-line-strong">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Edit or ask…"
            disabled={isStreaming}
            className="flex-1 border-0 bg-transparent py-1.5 text-[13.5px] text-ink outline-none placeholder:text-ink-3 disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || isStreaming}
            aria-label="Send"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-surface transition-opacity disabled:opacity-30"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
