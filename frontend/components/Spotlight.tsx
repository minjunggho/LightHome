"use client";

import Link from "next/link";

import type { SessionSummary } from "@/lib/api";
import {
  firstShift,
  formatAgo,
  formatClock,
  harmfulMass,
  riskVelocity,
} from "@/lib/analytics";
import { sessionDisplayName, sessionInitials } from "@/lib/session";
import { useLiveSession } from "@/lib/useLive";
import { RiskSparkline } from "./RiskSparkline";
import { ALERT_META, STAGE_META } from "./theme";

/** The home hero: a structural read on the single conversation that most wants
 *  attention (worst alert, then most recent). Opens its own stream so risk,
 *  velocity, and the Trust→Isolation shift update live. Tone-aware — the same
 *  layout reassures when the read is calm and escalates when it isn't. Never
 *  shows message content (privacy by projection). */
export function Spotlight({
  summary,
  nowMs,
}: {
  summary: SessionSummary;
  nowMs: number;
}) {
  const records = useLiveSession(summary.session_id, "parent");
  const latest = records[records.length - 1];

  const level = latest?.alert.level ?? summary.alert_level;
  const tone = ALERT_META[level];
  const flagged = level !== "none";

  const series = records.map((r) => harmfulMass(r.stage_probabilities));
  const mass = series.length ? series[series.length - 1] : 0;
  const velocity = riskVelocity(series);
  const shift = firstShift(records);
  const name = sessionDisplayName(summary.session_id);
  const stage = latest ? STAGE_META[latest.dominant_stage] : null;

  const guidance =
    latest?.guidance ??
    (flagged
      ? "Reviewing the structural read on this conversation."
      : "Nothing in this conversation breaks the normal pattern.");

  return (
    <section
      className="lh-rise overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-7"
      style={
        flagged
          ? { borderColor: tone.ring, boxShadow: `0 0 0 1px ${tone.ring}, var(--shadow-card)` }
          : undefined
      }
      aria-label={flagged ? "Most recent flag" : "Most recent activity"}
    >
      {/* Header: eyebrow + identity + status pill */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-[15px] font-semibold text-ink-2 ring-1 ring-line"
            aria-hidden="true"
          >
            {sessionInitials(summary.session_id)}
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
              {flagged ? "Most recent flag" : "Most recent activity"}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
              <span className="truncate text-[1.35rem] font-bold tracking-tight text-ink">
                {name}
              </span>
              <span className="tabular text-[13px] text-ink-3">
                {summary.turns} message{summary.turns === 1 ? "" : "s"} ·{" "}
                {formatAgo(summary.updated, nowMs)}
              </span>
            </div>
          </div>
        </div>

        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
          style={{ backgroundColor: tone.bg, color: tone.text }}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${level === "alert" ? "lh-blip" : ""}`}
            style={{ backgroundColor: tone.fill }}
            aria-hidden="true"
          />
          {tone.label}
        </span>
      </div>

      {/* Instrument row: risk number + the shift story + sparkline */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="flex flex-wrap items-end gap-x-8 gap-y-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Risk concentration
            </div>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className="tabular text-[2.6rem] font-bold leading-none tracking-tight text-ink">
                {Math.round(mass * 100)}
                <span className="text-[1.4rem] font-semibold text-ink-3">%</span>
              </span>
              {Math.abs(velocity) >= 0.02 && (
                <span
                  className="tabular inline-flex items-center gap-0.5 text-[13px] font-semibold"
                  style={{ color: velocity > 0 ? ALERT_META.alert.text : ALERT_META.none.text }}
                >
                  {velocity > 0 ? "▲" : "▼"} {Math.abs(Math.round(velocity * 100))} pts/msg
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
              {shift ? "Stage shift" : "Dominant stage"}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              {stage && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: stage.fill }}
                  aria-hidden="true"
                />
              )}
              <span className="text-[15px] font-semibold text-ink">
                {shift ? (
                  <>
                    {STAGE_META[shift.from].label}{" "}
                    <span className="text-ink-3">→</span> {STAGE_META[shift.to].label}
                  </>
                ) : (
                  stage?.label ?? "—"
                )}
              </span>
            </div>
            <div className="tabular mt-1 text-[12px] text-ink-3">
              {shift
                ? `left ${STAGE_META[shift.from].label} at ${formatClock(shift.tOffsetSec)}`
                : latest
                  ? `holding at ${formatClock(latest.t_offset_sec)}`
                  : "waiting for first message"}
            </div>
          </div>
        </div>

        <RiskSparkline series={series} level={level} width={132} height={42} />
      </div>

      {/* Guidance + drill-in */}
      <div
        className="mt-6 rounded-2xl px-4 py-3.5"
        style={{ backgroundColor: tone.bg }}
      >
        <p className="text-[13.5px] leading-relaxed" style={{ color: tone.text }}>
          {guidance}
        </p>
      </div>

      <Link
        href={`/parent/${encodeURIComponent(summary.session_id)}`}
        className="group mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-ink"
      >
        Open conversation
        <span className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true">
          →
        </span>
      </Link>
    </section>
  );
}
