"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { AlertBadge } from "@/components/AlertBadge";
import { AppShell } from "@/components/AppShell";
import { FlaggedMessages } from "@/components/FlaggedMessages";
import { LiveDot } from "@/components/LiveDot";
import { Metric, MetricGrid, type Trend } from "@/components/Metric";
import { Panel } from "@/components/Panel";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { StageTimeline, type TimelinePoint } from "@/components/StageTimeline";
import { TransitionFeed } from "@/components/TransitionFeed";
import { WhatChanged } from "@/components/WhatChanged";
import { ALERT_META } from "@/components/theme";
import type { DecisionRecord } from "@/lib/api";
import {
  confidence,
  firstShift,
  formatClock,
  harmfulMass,
  riskVelocity,
  transitions,
} from "@/lib/analytics";
import { sessionDisplayName } from "@/lib/session";
import { useLiveSession } from "@/lib/useLive";

export default function SessionDetail() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = decodeURIComponent(params.sessionId);
  const records = useLiveSession<DecisionRecord>(sessionId, "tns");
  const current = records[records.length - 1] ?? null;
  const name = sessionDisplayName(sessionId);

  const series = records.map((r) => harmfulMass(r.stage_probabilities));
  const mass = series.length ? series[series.length - 1] : 0;
  const velocity = riskVelocity(series);
  const conf = current ? confidence(current.stage_probabilities) : 0;
  const trans = transitions(records);
  const shift = firstShift(records);

  const points: TimelinePoint[] = records.map((r) => ({
    turn: r.turn,
    level: r.alert.level,
    dominant: r.dominant_stage,
    posterior: r.stage_probabilities,
  }));

  const velTrend: Trend = velocity > 0.02 ? "up" : velocity < -0.02 ? "down" : "flat";
  const velTone =
    velTrend === "up"
      ? ALERT_META.alert.text
      : velTrend === "down"
        ? ALERT_META.none.text
        : "var(--ink-3)";

  return (
    <AppShell
      title={name}
      subtitle="Live read on this conversation, in plain language"
      actions={<LiveDot level={current?.alert.level ?? "none"} label="Live" />}
    >
      <Link
        href="/parent"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 transition-colors hover:text-ink"
      >
        <span aria-hidden="true">←</span> All conversations
      </Link>

      {current ? (
        <div className="mt-4 space-y-5">
          <div className="lh-rise">
            <AlertBadge level={current.alert.level} guidance={current.guidance} />
          </div>

          <FlaggedMessages records={records} />

          <MetricGrid>
            <Metric
              label="Time in chat"
              value={formatClock(current.t_offset_sec)}
              hint={shift ? `changed character at ${formatClock(shift.tOffsetSec)}` : "steady so far"}
            />
            <Metric
              label="Risk level"
              value={`${Math.round(mass * 100)}`}
              unit="%"
              hint="higher means more concerning"
            />
            <Metric
              label="Trend"
              value={velTrend === "up" ? "Rising" : velTrend === "down" ? "Easing" : "Steady"}
              trend={velTrend}
              trendTone={velTone}
              trendLabel={
                velTrend === "up" ? "risk climbing" : velTrend === "down" ? "risk easing" : "holding steady"
              }
            />
            <Metric
              label="How sure we are"
              value={`${Math.round(conf * 100)}`}
              unit="%"
              hint={`based on ${records.length} message${records.length === 1 ? "" : "s"}`}
            />
          </MetricGrid>

          <div className="grid gap-5 lg:grid-cols-5">
            <Panel title="Conversation pattern" className="lg:col-span-3">
              <ProbabilityBar
                prior={current.prior_probabilities}
                posterior={current.stage_probabilities}
                plain
              />
            </Panel>
            <Panel className="lg:col-span-2">
              <StageTimeline points={points} />
            </Panel>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <TransitionFeed transitions={trans} />
            <WhatChanged record={current} />
          </div>
        </div>
      ) : (
        <div className="mt-8 grid place-items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center text-sm text-ink-3">
          Waiting for the first message on this conversation…
        </div>
      )}
    </AppShell>
  );
}
