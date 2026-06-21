"use client";

import { useState } from "react";

import { Renderer } from "@openuidev/react-lang";
import type { Library } from "@openuidev/react-lang";
import { ThemeProvider } from "@openuidev/react-ui";

/* Renders the model's streamed openui-lang into real React via the OpenUI SDK.
   This is the actual generative surface — the same Renderer the official example
   uses, wrapped in our soft-watch frame with a streaming indicator and a peek at
   the generated source. */
export function GenCanvas({
  library,
  code,
  isStreaming,
  elapsed,
}: {
  library: Library;
  code: string | null;
  isStreaming: boolean;
  elapsed: number | null;
}) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
          {isStreaming ? (
            <>
              <Spinner /> Generating…
            </>
          ) : code ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.66_0.11_168)]" /> Generated
            </>
          ) : (
            <>Canvas</>
          )}
          {elapsed != null && !isStreaming && code && (
            <span className="tabular font-normal text-ink-3">· {(elapsed / 1000).toFixed(1)}s</span>
          )}
        </span>
        {code && (
          <button
            onClick={() => setShowSource((s) => !s)}
            className="rounded-lg px-2 py-1 text-[12px] font-semibold text-brand-ink transition-colors hover:bg-surface-2"
          >
            {showSource ? "Hide code" : "View code"}
          </button>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-5">
        {showSource && code && (
          <pre className="mb-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-rail px-4 py-3 font-mono text-[11px] leading-relaxed text-rail-fg">
            {code}
          </pre>
        )}

        {code ? (
          <ThemeProvider>
            <Renderer response={code} library={library} isStreaming={isStreaming} />
          </ThemeProvider>
        ) : (
          <div className="grid h-full place-items-center text-center text-sm text-ink-3">
            {isStreaming ? "Composing the dashboard…" : "The generated dashboard will render here."}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-[2px] border-line-strong border-t-brand"
      aria-hidden="true"
    />
  );
}
