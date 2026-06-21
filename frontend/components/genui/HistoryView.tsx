"use client";

import type { Dashboard } from "@/lib/openui/store";
import { formatAgo } from "@/lib/analytics";

/* The History tab — every dashboard the user has generated this session, newest
   first. Click to reopen it on the Build tab; the store keeps the full
   conversation and openui-lang so it renders exactly as it was left. */
export function HistoryView({
  dashboards,
  activeId,
  nowMs,
  onOpen,
  onDelete,
  onNew,
}: {
  dashboards: Dashboard[];
  activeId: string | null;
  nowMs: number;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  if (dashboards.length === 0) {
    return (
      <div className="mt-6 grid place-items-center rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-20 text-center">
        <div className="max-w-sm">
          <p className="font-medium text-ink">No dashboards yet</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">
            Dashboards you generate are kept here so you can reopen them. Describe one to get started.
          </p>
          <button
            onClick={onNew}
            className="mt-5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-strong"
          >
            New dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {dashboards.map((d) => {
        const active = d.id === activeId;
        const turns = d.conversation.filter((m) => m.role === "user").length;
        return (
          <article
            key={d.id}
            className="group relative flex flex-col rounded-3xl border bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
            style={active ? { borderColor: "var(--brand)", boxShadow: "0 0 0 1px var(--brand), var(--shadow-card)" } : undefined}
          >
            <button onClick={() => onOpen(d.id)} className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.code ? "var(--brand)" : "var(--line-strong)" }}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
                  {active ? "Open now" : d.code ? "Dashboard" : "Draft"}
                </span>
              </div>
              <h3 className="mt-2 line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
                {d.title}
              </h3>
              <p className="tabular mt-2 text-xs text-ink-3">
                {turns} prompt{turns === 1 ? "" : "s"} · {formatAgo(new Date(d.updatedAt).toISOString(), nowMs)}
              </p>
            </button>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <button
                onClick={() => onOpen(d.id)}
                className="group/open inline-flex items-center gap-1 text-[13px] font-semibold text-brand-ink"
              >
                Open
                <span className="transition-transform duration-150 group-hover/open:translate-x-0.5" aria-hidden="true">
                  →
                </span>
              </button>
              <button
                onClick={() => onDelete(d.id)}
                aria-label="Delete dashboard"
                className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                </svg>
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
