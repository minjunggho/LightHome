"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { LiveDot } from "@/components/LiveDot";
import { SessionCard } from "@/components/SessionCard";
import { Spotlight } from "@/components/Spotlight";
import { StatCard, StatGroup } from "@/components/StatCard";
import { ALERT_META } from "@/components/theme";
import type { AlertLevel, SessionSummary } from "@/lib/api";
import { startAllFeeds, type FeedController } from "@/lib/testFeed";
import { useLiveSessions, useNow } from "@/lib/useLive";

const RANK: Record<AlertLevel, number> = { alert: 2, watch: 1, none: 0 };

export default function Home() {
  const { sessions, connected, error, loading } = useLiveSessions();
  const nowMs = useNow();

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

  const alerts = sessions.filter((s) => s.alert_level === "alert").length;
  const watches = sessions.filter((s) => s.alert_level === "watch").length;
  const calm = sessions.filter((s) => s.alert_level === "none").length;
  const overall: AlertLevel = alerts ? "alert" : watches ? "watch" : "none";

  // Worst first, then most recent — drives both the spotlight and the grid.
  const ranked = [...sessions].sort(
    (a, b) =>
      RANK[b.alert_level] - RANK[a.alert_level] ||
      Date.parse(b.updated) - Date.parse(a.updated),
  );
  const spotlight = ranked[0] ?? null;

  return (
    <AppShell
      title="Home"
      subtitle="Your live read on every monitored conversation"
      actions={
        <div className="flex items-center gap-3">
          <LiveDot level={overall} label={connected ? "Live" : "Offline"} />
          {sessions.length > 0 && (
            <FeedButton feeding={feeding} onStart={startFeed} onStop={stopFeed} />
          )}
        </div>
      }
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
          — the dashboard reconnects automatically.
          {error && <span className="ml-1 opacity-70">({error})</span>}
        </div>
      )}

      {sessions.length > 0 ? (
        <div className="space-y-7">
          {spotlight && <Spotlight summary={spotlight} nowMs={nowMs} />}

          <StatGroup>
            <StatCard
              label="Monitored"
              value={`${sessions.length}`}
              hint="active conversations"
              icon="monitored"
            />
            <StatCard label="Calm" value={`${calm}`} accent={ALERT_META.none.fill} icon="check" />
            <StatCard label="Watch" value={`${watches}`} accent={ALERT_META.watch.fill} icon="clock" />
            <StatCard label="Alerts" value={`${alerts}`} accent={ALERT_META.alert.fill} icon="risk" />
          </StatGroup>

          <section>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-[15px] font-semibold text-ink">All conversations</h2>
              <Link
                href="/parent"
                className="group inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
              >
                Watch console
                <span className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ranked.map((s) => (
                <SessionCard key={s.session_id} summary={s} nowMs={nowMs} />
              ))}
            </div>
          </section>

          <Footer />
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

/* Slim provenance + cross-links — replaces the old wall of explainer text.
   The credibility line judges want to hear, kept to one breath. */
function Footer() {
  return (
    <section className="rounded-3xl border border-line bg-surface-2 p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <p className="max-w-prose text-[13.5px] leading-relaxed text-ink-2">
          Lighthome reads the <span className="font-semibold text-ink">shape</span> of a
          conversation — the structural shift{" "}
          <span className="font-semibold text-brand-ink">Trust → Isolation</span> — and alerts
          before anything explicit is said. Four features run before Claude, so structure can
          overrule the model. Always human-in-the-loop; it never blocks or reports on its own.
        </p>
        <div className="flex shrink-0 gap-2">
          <ViewLink href="/parent" label="Watch console" />
          <ViewLink href="/platform" label="Trust & Safety" />
        </div>
      </div>
    </section>
  );
}

function ViewLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 rounded-xl bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:shadow-pop"
    >
      {label}
      <span className="text-brand-ink transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true">
        →
      </span>
    </Link>
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
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <h2 className="mt-5 text-[1.5rem] font-bold tracking-tight text-ink">
          Nothing to watch yet
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          The dashboard reads whatever flows through the detector — a linked iMessage thread
          via the ingestion adapter, or local test traffic. Start a test feed to run three
          conversations through the real pipeline and watch the read update live.
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
