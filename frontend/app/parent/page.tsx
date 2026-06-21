"use client";

import { useCallback, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { LiveDot } from "@/components/LiveDot";
import { SessionCard } from "@/components/SessionCard";
import { StatCard, StatGroup } from "@/components/StatCard";
import { ALERT_META } from "@/components/theme";
import { startAllFeeds, type FeedController } from "@/lib/testFeed";
import { useLiveSessions, useNow } from "@/lib/useLive";

export default function ParentConsole() {
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

  return (
    <AppShell
      title="Watch console"
      subtitle="A simple, live read on every chat we're watching"
      actions={
        <div className="flex items-center gap-3">
          <LiveDot
            level={alerts ? "alert" : watches ? "watch" : "none"}
            label={connected ? "Live" : "Offline"}
          />
          <FeedButton feeding={feeding} onStart={startFeed} onStop={stopFeed} />
        </div>
      }
    >
      {!connected && !loading && (
        <div
          className="mb-5 rounded-xl p-4 text-sm"
          style={{ backgroundColor: ALERT_META.watch.bg, color: ALERT_META.watch.text }}
        >
          Can&apos;t reach the detector backend. Start it with{" "}
          <code className="rounded bg-black/5 px-1 py-0.5 text-[12px]">
            uvicorn app.main:app --port 8000
          </code>
          {" "}— the console reconnects automatically.
          {error && <span className="ml-1 opacity-70">({error})</span>}
        </div>
      )}

      <StatGroup>
        <StatCard label="Chats watched" value={`${sessions.length}`} hint="active conversations" />
        <StatCard label="Looks normal" value={`${calm}`} accent={ALERT_META.none.fill} />
        <StatCard label="Worth watching" value={`${watches}`} accent={ALERT_META.watch.fill} />
        <StatCard label="Needs attention" value={`${alerts}`} accent={ALERT_META.alert.fill} />
      </StatGroup>

      {sessions.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sessions.map((s) => (
            <SessionCard key={s.session_id} summary={s} nowMs={nowMs} />
          ))}
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
      <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center text-sm text-ink-3">
        Connecting to the detector…
      </div>
    );
  }
  return (
    <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center">
      <div className="max-w-md">
        <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-brand-tint text-brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </div>
        <p className="mt-4 font-medium text-ink">No monitored conversations yet</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          The console reads whatever flows through the detector — a linked iMessage
          thread via the ingestion adapter, or local test traffic. Start a test
          feed to watch three conversations run through the real pipeline live.
        </p>
        {connected && (
          <button
            onClick={onStart}
            disabled={feeding}
            className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-fg transition-colors hover:bg-brand-strong disabled:opacity-50"
          >
            {feeding ? "Feeding…" : "Start test feed"}
          </button>
        )}
      </div>
    </div>
  );
}
