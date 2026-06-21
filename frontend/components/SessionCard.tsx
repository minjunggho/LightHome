"use client";

import Link from "next/link";

import type { SessionSummary } from "@/lib/api";
import {
  formatAgo,
  harmfulMass,
  riskVelocity,
} from "@/lib/analytics";
import { sessionDisplayName, sessionInitials } from "@/lib/session";
import { useLiveSession } from "@/lib/useLive";
import { RiskSparkline } from "./RiskSparkline";
import { ALERT_META, STAGE_META } from "./theme";

/** One live monitored conversation. Opens its own SSE stream so the sparkline
 *  and metrics update in place; clicking drills into the full analytics. */
export function SessionCard({
  summary,
  nowMs,
}: {
  summary: SessionSummary;
  nowMs: number;
}) {
  const records = useLiveSession(summary.session_id, "parent");
  const latest = records[records.length - 1];

  // Prefer the live stream; fall back to the poll summary until the first
  // streamed record lands.
  const level = latest?.alert.level ?? summary.alert_level;
  const tone = ALERT_META[level];
  const series = records.map((r) => harmfulMass(r.stage_probabilities));
  const mass = series.length ? series[series.length - 1] : 0;
  const velocity = riskVelocity(series);
  const name = sessionDisplayName(summary.session_id);

  return (
    <Link
      href={`/parent/${encodeURIComponent(summary.session_id)}`}
      className="group block rounded-3xl border border-line bg-surface p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop"
      style={
        level === "alert"
          ? { borderColor: tone.ring, boxShadow: `0 0 0 1px ${tone.ring}, var(--shadow-card)` }
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-sunken text-[12px] font-semibold text-ink-2 ring-1 ring-line"
            aria-hidden="true"
          >
            {sessionInitials(summary.session_id)}
          </span>
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">{name}</div>
            <div className="tabular text-xs text-ink-3">
              {summary.turns} message{summary.turns === 1 ? "" : "s"} ·{" "}
              {formatAgo(summary.updated, nowMs)}
            </div>
          </div>
        </div>

        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold"
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

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
            Risk level
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="tabular text-2xl font-semibold leading-none text-ink">
              {Math.round(mass * 100)}
              <span className="text-base text-ink-3">%</span>
            </span>
            {latest && (
              <span
                className="text-[12px] font-medium"
                style={{ color: STAGE_META[latest.dominant_stage].text }}
              >
                {STAGE_META[latest.dominant_stage].label}
              </span>
            )}
          </div>
          {Math.abs(velocity) >= 0.02 && (
            <div
              className="mt-1 text-[11px] font-semibold"
              style={{ color: velocity > 0 ? ALERT_META.alert.text : ALERT_META.none.text }}
            >
              {velocity > 0
                ? `▲ Rising${velocity >= 0.08 ? " fast" : ""}`
                : "▼ Easing off"}
            </div>
          )}
        </div>

        <RiskSparkline series={series} level={level} />
      </div>
    </Link>
  );
}
