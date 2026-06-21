"use client";

import { useCallback, useMemo, useState } from "react";

import dynamic from "next/dynamic";

import { openuiLibrary } from "@openuidev/react-ui/genui-lib";

import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/genui/Composer";
import { ConversationPanel } from "@/components/genui/ConversationPanel";
import { HistoryView } from "@/components/genui/HistoryView";
import { VoiceSummaryButton } from "@/components/genui/VoiceSummaryButton";
import { harmfulMass } from "@/lib/analytics";
import { sessionDisplayName } from "@/lib/session";
import { startAllFeeds } from "@/lib/testFeed";
import { useGenStore } from "@/lib/openui/store";
import { useLiveLatest, useLiveSessions, useNow } from "@/lib/useLive";

// The OpenUI Renderer touches `document`, so keep the canvas client-only.
const GenCanvas = dynamic(
  () => import("@/components/genui/GenCanvas").then((m) => m.GenCanvas),
  { ssr: false },
);

const SUGGESTIONS = [
  "Risk level across every conversation",
  "Alert vs watch vs normal breakdown",
  "Messages per conversation",
  "A triage board sorted by status",
];

type Tab = "build" | "history";

export default function GenerativeDashboard() {
  const { sessions, connected } = useLiveSessions();
  const nowMs = useNow();

  const dashboards = useGenStore((s) => s.dashboards);
  const activeId = useGenStore((s) => s.activeId);
  const isStreaming = useGenStore((s) => s.isStreaming);
  const streamingText = useGenStore((s) => s.streamingText);
  const elapsed = useGenStore((s) => s.elapsed);
  const send = useGenStore((s) => s.send);
  const newDashboard = useGenStore((s) => s.newDashboard);
  const selectDashboard = useGenStore((s) => s.selectDashboard);
  const deleteDashboard = useGenStore((s) => s.deleteDashboard);

  const [tab, setTab] = useState<Tab>("build");

  const active = useMemo(
    () => dashboards.find((d) => d.id === activeId) ?? null,
    [dashboards, activeId],
  );
  const dataCount = sessions.length;

  // The last exchange in the active dashboard — fed to the spoken summary.
  const lastPrompt = useMemo(
    () =>
      [...(active?.conversation ?? [])].reverse().find((m) => m.role === "user")
        ?.content ?? "",
    [active],
  );
  const lastAnswer = useMemo(() => {
    const a = [...(active?.conversation ?? [])]
      .reverse()
      .find((m) => m.role === "assistant");
    return a?.text || active?.code || "";
  }, [active]);

  // Latest parent read per session → lets the snapshot carry risk + stage, not
  // just message count + status.
  const sessionIds = useMemo(() => sessions.map((s) => s.session_id), [sessions]);
  const latest = useLiveLatest(sessionIds);

  // The live snapshot handed to the model — structural signals only (no raw
  // message content; privacy by projection holds on this surface).
  const liveData = useMemo(
    () =>
      sessions.map((s) => {
        const rec = latest[s.session_id];
        const risk = rec ? Math.round(harmfulMass(rec.stage_probabilities) * 100) : null;
        return {
          conversation: sessionDisplayName(s.session_id),
          messages: s.turns,
          status: s.alert_level,
          risk_pct: risk,
          dominant_stage: rec?.dominant_stage ?? null,
        };
      }),
    [sessions, latest],
  );

  const submit = useCallback((text: string) => send(text, liveData), [send, liveData]);
  const startFeed = useCallback(() => {
    startAllFeeds();
  }, []);

  const onNew = useCallback(() => {
    newDashboard();
    setTab("build");
  }, [newDashboard]);
  const openDashboard = useCallback(
    (id: string) => {
      selectDashboard(id);
      setTab("build");
    },
    [selectDashboard],
  );

  const showWorkspace = tab === "build" && !!active;

  const aside = useMemo(
    () =>
      showWorkspace && active ? (
        <ConversationPanel
          messages={active.conversation}
          streamingText={streamingText}
          isStreaming={isStreaming}
          onSubmit={submit}
        />
      ) : undefined,
    [showWorkspace, active, streamingText, isStreaming, submit],
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Describe a view of your live detector data — generated with OpenUI"
      actions={
        <div className="flex items-center gap-2">
          <Segmented tab={tab} onTab={setTab} historyCount={dashboards.length} />
          {tab === "build" && active && (
            <button
              onClick={onNew}
              className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink shadow-card transition-colors hover:bg-surface-2"
            >
              + New
            </button>
          )}
        </div>
      }
      aside={aside}
    >
      {tab === "history" ? (
        <HistoryView
          dashboards={dashboards}
          activeId={activeId}
          nowMs={nowMs}
          onOpen={openDashboard}
          onDelete={deleteDashboard}
          onNew={onNew}
        />
      ) : active ? (
        <div className="flex h-[calc(100vh-200px)] min-h-[460px] flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Chip>
              <SparkDot /> Claude · via OpenUI
            </Chip>
            <Chip tone={connected ? "ok" : "warn"}>
              {connected ? "✓" : "…"} Live data from Lighthome
            </Chip>
            <Chip>
              {dataCount} conversation{dataCount === 1 ? "" : "s"} attached
            </Chip>
            {lastAnswer && (
              <VoiceSummaryButton
                question={lastPrompt}
                answer={lastAnswer}
                disabled={isStreaming}
              />
            )}
          </div>
          <div className="min-h-0 flex-1">
            <GenCanvas
              library={openuiLibrary}
              code={active.code}
              isStreaming={isStreaming}
              elapsed={elapsed}
              answer={
                active.code
                  ? undefined
                  : [...active.conversation].reverse().find((m) => m.role === "assistant")?.text
              }
            />
          </div>
        </div>
      ) : (
        <IdleState
          onSubmit={submit}
          dataCount={dataCount}
          connected={connected}
          onStartFeed={startFeed}
        />
      )}
    </AppShell>
  );
}

function Segmented({
  tab,
  onTab,
  historyCount,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  historyCount: number;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5">
      <TabButton active={tab === "build"} onClick={() => onTab("build")}>
        Build
      </TabButton>
      <TabButton active={tab === "history"} onClick={() => onTab("history")}>
        History
        {historyCount > 0 && (
          <span
            className={`tabular ml-1.5 rounded-full px-1.5 text-[11px] font-semibold ${
              tab === "history" ? "bg-surface-2 text-ink-2" : "bg-surface text-ink-3"
            }`}
          >
            {historyCount}
          </span>
        )}
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
        active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function IdleState({
  onSubmit,
  dataCount,
  connected,
  onStartFeed,
}: {
  onSubmit: (text: string) => void;
  dataCount: number;
  connected: boolean;
  onStartFeed: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center pt-[8vh] text-center">
      <h2 className="text-balance text-[2rem] font-bold leading-[1.1] tracking-tight text-ink sm:text-[2.5rem]">
        Build a dashboard from a sentence.
      </h2>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2">
        Describe what you want to see across your monitored conversations. Lighthome
        attaches the live detector data and OpenUI generates the view with Claude.
      </p>

      <div className="mt-7 w-full text-left">
        <ComposerEntry onSubmit={onSubmit} dataCount={dataCount} />
      </div>

      {dataCount === 0 ? (
        <p className="mt-4 text-[13px] text-ink-3">
          No live data yet.{" "}
          {connected ? (
            <button onClick={onStartFeed} className="font-semibold text-brand-ink underline-offset-2 hover:underline">
              Start a test feed
            </button>
          ) : (
            <span>Start the detector backend to attach data.</span>
          )}
        </p>
      ) : (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSubmit(s)}
              className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-2 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:text-ink hover:shadow-pop"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Local wrapper so the idle Composer owns its own draft state.
function ComposerEntry({
  onSubmit,
  dataCount,
}: {
  onSubmit: (text: string) => void;
  dataCount: number;
}) {
  const [value, setValue] = useState("");
  return (
    <Composer
      value={value}
      onChange={setValue}
      onSubmit={() => {
        if (value.trim()) {
          onSubmit(value.trim());
          setValue("");
        }
      }}
      dataCount={dataCount}
      autoFocus
      placeholder="Summarize, chart, compare…"
    />
  );
}

function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ok" | "warn";
}) {
  const styles =
    tone === "ok"
      ? "bg-[oklch(0.97_0.03_168)] text-[oklch(0.44_0.1_168)]"
      : tone === "warn"
        ? "bg-[oklch(0.97_0.04_82)] text-[oklch(0.48_0.11_68)]"
        : "bg-surface-2 text-ink-2";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold ${styles}`}>
      {children}
    </span>
  );
}

function SparkDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />;
}
