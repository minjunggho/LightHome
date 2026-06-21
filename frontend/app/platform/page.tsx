"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AlertBadge } from "@/components/AlertBadge";
import { AppShell } from "@/components/AppShell";
import { ConditionsTable } from "@/components/ConditionsTable";
import { FeatureGrid } from "@/components/FeatureGrid";
import { LiveDot } from "@/components/LiveDot";
import { Panel } from "@/components/Panel";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { StatCard, StatGroup } from "@/components/StatCard";
import { ALERT_META, STAGE_META } from "@/components/theme";
import type { AlertLevel, DecisionRecord, SessionSummary } from "@/lib/api";
import { formatAgo } from "@/lib/analytics";
import { sessionDisplayName, sessionInitials } from "@/lib/session";
import { startAllFeeds, type FeedController } from "@/lib/testFeed";
import { useLiveSession, useLiveSessions, useNow } from "@/lib/useLive";

const RANK: Record<AlertLevel, number> = { alert: 2, watch: 1, none: 0 };
const byRank = (a: SessionSummary, b: SessionSummary) =>
  RANK[b.alert_level] - RANK[a.alert_level] || Date.parse(b.updated) - Date.parse(a.updated);

export default function PlatformPanel() {
  const { sessions, connected, error, loading } = useLiveSessions();
  const nowMs = useNow();

  const [selected, setSelected] = useState<string | null>(null);

  const feedRef = useRef<FeedController | null>(null);
  const [feeding, setFeeding] = useState(false);

  const startFeed = useCallback(() => {
    feedRef.current?.stop();
    feedRef.current = startAllFeeds();
    setFeeding(true);
  }, []);
  const stopFeed = useCallback(() => {
    feedRef.current?.stop();
    feedRef.current = null;
    setFeeding(false);
  }, []);

  // Keep a valid case selected: hold the analyst's pick while it exists, else
  // auto-focus the highest-priority conversation in the queue.
  useEffect(() => {
    setSelected((prev) => {
      if (!sessions.length) return null;
      if (prev && sessions.some((s) => s.session_id === prev)) return prev;
      return [...sessions].sort(byRank)[0].session_id;
    });
  }, [sessions]);

  const ranked = [...sessions].sort(byRank);
  const records = useLiveSession<DecisionRecord>(selected, "tns");
  const current = records[records.length - 1] ?? null;
  const conditionsMet = current
    ? Object.values(current.alert.conditions).filter((c) => c.met).length
    : 0;

  const overall: AlertLevel = ranked[0]?.alert_level ?? "none";
  const selectedName = selected ? sessionDisplayName(selected) : "";

  return (
    <AppShell
      title="Trust & Safety"
      subtitle="The full detail behind every flagged conversation"
      actions={
        <div className="flex items-center gap-3">
          <LiveDot level={overall} label={connected ? "Live" : "Offline"} />
          {sessions.length > 0 && (
            <FeedButton feeding={feeding} onStart={startFeed} onStop={stopFeed} />
          )}
        </div>
      }
      aside={current ? <TranscriptList records={records} name={selectedName} /> : undefined}
    >
      {!connected && !loading && (
        <div
          className="mb-5 rounded-2xl p-4 text-sm"
          style={{ backgroundColor: ALERT_META.watch.bg, color: ALERT_META.watch.text }}
        >
          Can&apos;t reach the detector backend. Start it with{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-[12px]">
            uvicorn app.main:app --port 8000
          </code>{" "}
          — the queue reconnects automatically.
          {error && <span className="ml-1 opacity-70">({error})</span>}
        </div>
      )}

      {sessions.length > 0 ? (
        <div className="space-y-5">
          <QueueStrip
            sessions={ranked}
            selected={selected}
            nowMs={nowMs}
            onSelect={setSelected}
          />

          <StatGroup>
            <StatCard
              label="Status"
              value={current ? ALERT_META[current.alert.level].label : "—"}
              accent={current ? ALERT_META[current.alert.level].fill : undefined}
              icon="status"
            />
            <StatCard
              label="Current stage"
              value={current ? STAGE_META[current.dominant_stage].label : "—"}
              accent={current ? STAGE_META[current.dominant_stage].fill : undefined}
              icon="stage"
            />
            <StatCard
              label="Alert checks"
              value={current ? `${conditionsMet} / 4` : "—"}
              hint="all four must trip to alert"
              icon="check"
            />
            <StatCard
              label="AI second opinion"
              value={current ? `${current.claude.latency_ms} ms` : "—"}
              hint={current?.claude.model}
              icon="clock"
            />
          </StatGroup>

          {current ? (
            <>
              <div className="grid items-start gap-5 lg:grid-cols-2">
                <div className="lh-rise lg:col-span-2">
                  <AlertBadge level={current.alert.level} guidance={current.guidance} />
                </div>
                <Panel
                  title="Alert checklist"
                  aside={<span className="text-xs text-ink-3">all four must trip to alert</span>}
                >
                  <ConditionsTable
                    conditions={current.alert.conditions}
                    reason={current.alert.reason}
                  />
                </Panel>
                <Panel title="Conversation pattern">
                  <ProbabilityBar
                    prior={current.prior_probabilities}
                    posterior={current.stage_probabilities}
                    plain
                  />
                </Panel>
                <Panel
                  title="Signals we measure"
                  aside={<span className="text-xs text-ink-3">measured before the AI step</span>}
                >
                  <FeatureGrid features={current.features} />
                </Panel>
                <Panel title="AI second opinion">
                  <p className="text-sm leading-relaxed text-ink-2">{current.claude.rationale}</p>
                  <p className="tabular mt-3 text-xs text-ink-3">
                    {current.claude.model} · {current.claude.latency_ms} ms
                  </p>
                </Panel>
              </div>

              {/* Transcript fallback when the right rail is hidden (below xl) */}
              <div className="xl:hidden">
                <Panel
                  title={`Transcript · ${selectedName}`}
                  aside={<span className="tabular text-xs text-ink-3">{records.length} messages</span>}
                >
                  <ol className="space-y-2.5">
                    {records.map((r) => (
                      <TranscriptRow key={r.turn} record={r} />
                    ))}
                  </ol>
                </Panel>
              </div>
            </>
          ) : (
            <div className="grid place-items-center rounded-3xl border border-dashed border-line-strong bg-surface px-6 py-16 text-center text-sm text-ink-2">
              Waiting for the first message on {selectedName || "this conversation"}…
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          connected={connected}
          loading={loading}
          feeding={feeding}
          onStart={startFeed}
        />
      )}
    </AppShell>
  );
}

/* The moderator queue — every live conversation as a triage chip, worst first.
   Selecting one loads its full decision record. Status rides a label + dot, not
   color alone. */
function QueueStrip({
  sessions,
  selected,
  nowMs,
  onSelect,
}: {
  sessions: SessionSummary[];
  selected: string | null;
  nowMs: number;
  onSelect: (id: string) => void;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-ink">Queue</h2>
        <span className="tabular text-xs text-ink-3">
          {sessions.length} conversation{sessions.length === 1 ? "" : "s"}
        </span>
      </div>
      {/* px/py + matching -mx give the active ring and hover-lift room inside the
          scroller so overflow-x doesn't clip them, while keeping cards aligned. */}
      <div className="-mx-1.5 flex gap-3 overflow-x-auto px-1.5 py-2">
        {sessions.map((s) => {
          const tone = ALERT_META[s.alert_level];
          const active = s.session_id === selected;
          return (
            <button
              key={s.session_id}
              onClick={() => onSelect(s.session_id)}
              aria-pressed={active}
              className={`group flex min-w-[208px] shrink-0 items-center gap-3 rounded-2xl border bg-surface p-3.5 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-pop ${
                active ? "border-brand" : "border-line"
              }`}
              style={
                active ? { boxShadow: "0 0 0 1px var(--brand), var(--shadow-card)" } : undefined
              }
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2 ring-1 ring-line"
                aria-hidden="true"
              >
                {sessionInitials(s.session_id)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-ink">
                    {sessionDisplayName(s.session_id)}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.alert_level === "alert" ? "lh-blip" : ""}`}
                    style={{ backgroundColor: tone.fill }}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                  <span className="font-semibold" style={{ color: tone.text }}>
                    {tone.label}
                  </span>
                  <span className="text-ink-3">·</span>
                  <span className="tabular text-ink-3">
                    {s.turns} msg · {formatAgo(s.updated, nowMs)}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FeedButton({
  feeding,
  onStart,
  onStop,
}: {
  feeding: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      onClick={feeding ? onStop : onStart}
      className="rounded-lg bg-brand px-3 py-1.5 text-[13px] font-semibold text-brand-fg transition-colors hover:bg-brand-strong"
    >
      {feeding ? "Stop test feed" : "Start test feed"}
    </button>
  );
}

function TranscriptList({ records, name }: { records: DecisionRecord[]; name: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line px-6 py-5">
        <h2 className="text-[15px] font-semibold text-ink">Transcript</h2>
        <p className="tabular mt-0.5 truncate text-xs text-ink-3">
          {name} · {records.length} message{records.length === 1 ? "" : "s"} · every message
        </p>
      </div>
      <ol className="flex-1 space-y-2.5 overflow-y-auto px-6 py-5">
        {records.map((r) => (
          <TranscriptRow key={r.turn} record={r} />
        ))}
      </ol>
    </div>
  );
}

function TranscriptRow({ record: r }: { record: DecisionRecord }) {
  const tone = ALERT_META[r.alert.level];
  return (
    <li className="rounded-2xl bg-surface-2 p-3.5">
      <div className="flex items-center justify-between text-[11px]">
        <span className="tabular font-medium text-ink-2">
          msg {r.turn} · {STAGE_META[r.dominant_stage].label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold"
          style={{ backgroundColor: tone.bg, color: tone.text }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.fill }} />
          {tone.label}
        </span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink">{r.raw_text}</p>
    </li>
  );
}

function EmptyState({
  connected,
  loading,
  feeding,
  onStart,
}: {
  connected: boolean;
  loading: boolean;
  feeding: boolean;
  onStart: () => void;
}) {
  if (loading) {
    return (
      <div className="mt-8 grid place-items-center rounded-3xl border border-dashed border-line-strong bg-surface/50 px-6 py-20 text-center text-sm text-ink-3">
        Connecting to the detector…
      </div>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-surface p-8 shadow-card sm:p-10">
      <div className="max-w-xl">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-brand-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l8 3v6c0 4.5-3 7.5-8 9-5-1.5-8-4.5-8-9V6z" />
          </svg>
        </div>
        <h2 className="mt-5 text-[1.5rem] font-bold tracking-tight text-ink">
          No conversations in the queue
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Trust &amp; Safety reads the same live conversations as the watch console, with the full
          detail behind each decision — every message, the signals we measure, and the four checks
          that decide an alert. Start a test feed to run three conversations through and review them
          live.
        </p>
        {connected ? (
          <button
            onClick={onStart}
            disabled={feeding}
            className="mt-6 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-strong disabled:opacity-50"
          >
            {feeding ? "Feeding…" : "Start test feed"}
          </button>
        ) : (
          <p className="mt-6 text-[13px] font-medium text-ink-3">
            Start the detector backend to begin.
          </p>
        )}
      </div>
    </div>
  );
}
