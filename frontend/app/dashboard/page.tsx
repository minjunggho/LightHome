"use client";

import { useCallback, useMemo, useState } from "react";

import dynamic from "next/dynamic";

import { openuiLibrary } from "@openuidev/react-ui/genui-lib";

import { AppShell } from "@/components/AppShell";
import { Composer } from "@/components/genui/Composer";
import { ConversationPanel } from "@/components/genui/ConversationPanel";

// The OpenUI Renderer touches `document`, so keep the canvas client-only.
const GenCanvas = dynamic(
  () => import("@/components/genui/GenCanvas").then((m) => m.GenCanvas),
  { ssr: false },
);
import { sessionDisplayName } from "@/lib/session";
import { startAllFeeds } from "@/lib/testFeed";
import { useGenDashboard } from "@/lib/openui/useGenDashboard";
import { useLiveSessions } from "@/lib/useLive";

const SUGGESTIONS = [
  "Risk level across every conversation",
  "Alert vs watch vs normal breakdown",
  "Messages per conversation",
  "A triage board sorted by status",
];

export default function GenerativeDashboard() {
  const { sessions, connected } = useLiveSessions();
  const { conversation, dashboardCode, isStreaming, streamingText, elapsed, send, clear } =
    useGenDashboard();

  const dataCount = sessions.length;
  const active = conversation.length > 0 || dashboardCode !== null;

  // The live snapshot handed to the model — the same /sessions the rest of the
  // app reads, shaped for prompting. No raw message content (privacy holds here).
  const liveData = useMemo(
    () =>
      sessions.map((s) => ({
        conversation: sessionDisplayName(s.session_id),
        messages: s.turns,
        status: s.alert_level,
      })),
    [sessions],
  );

  const submit = useCallback((text: string) => send(text, liveData), [send, liveData]);

  const startFeed = useCallback(() => {
    startAllFeeds();
  }, []);

  const aside = useMemo(
    () => (
      <ConversationPanel
        messages={conversation}
        streamingText={streamingText}
        isStreaming={isStreaming}
        onSubmit={submit}
      />
    ),
    [conversation, streamingText, isStreaming, submit],
  );

  return (
    <AppShell
      title="Dashboard"
      subtitle="Describe a view of your live detector data — generated with OpenUI"
      actions={
        active ? (
          <button
            onClick={clear}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink shadow-card transition-colors hover:bg-surface-2"
          >
            + New dashboard
          </button>
        ) : undefined
      }
      aside={active ? aside : undefined}
    >
      {active ? (
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
          </div>
          <div className="min-h-0 flex-1">
            <GenCanvas
              library={openuiLibrary}
              code={dashboardCode}
              isStreaming={isStreaming}
              elapsed={elapsed}
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
