"use client";

import Link from "next/link";

import { AlertBadge } from "@/components/AlertBadge";
import { ConditionsTable } from "@/components/ConditionsTable";
import { FeatureGrid } from "@/components/FeatureGrid";
import { PlayerControls } from "@/components/PlayerControls";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { ALERT_META } from "@/components/theme";
import type { DecisionRecord } from "@/lib/api";
import { usePlayer } from "@/lib/usePlayer";

export default function PlatformPanel() {
  const p = usePlayer<DecisionRecord>("tns");
  const current = p.records[p.records.length - 1] ?? null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lighthome — Trust &amp; Safety</h1>
          <p className="text-sm text-neutral-500">
            Full decision record: transcript, alert conditions, and feature decomposition.
          </p>
        </div>
        <Link href="/parent" className="text-sm text-neutral-500 underline">
          ← Parent view
        </Link>
      </header>

      <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
        <PlayerControls
          activeFile={p.activeFile}
          playing={p.playing}
          busy={p.busy}
          atEnd={p.atEnd}
          hasDemo={!!p.demo}
          sent={p.records.length}
          total={p.demo?.messages.length ?? 0}
          onSelect={p.select}
          onStep={p.step}
          onPlay={p.play}
          onPause={p.pause}
          onReset={p.reset}
        />
        {p.error && <p className="mt-3 text-sm text-red-600">{p.error}</p>}
      </section>

      {current ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: live decision */}
          <div className="space-y-6">
            <AlertBadge level={current.alert.level} guidance={current.guidance} />
            <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Stage distribution
              </h2>
              <ProbabilityBar
                prior={current.prior_probabilities}
                posterior={current.stage_probabilities}
              />
            </section>
            <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Alert conditions (all four must hold)
              </h2>
              <ConditionsTable
                conditions={current.alert.conditions}
                reason={current.alert.reason}
              />
            </section>
            <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Structural features
              </h2>
              <FeatureGrid features={current.features} />
            </section>
            <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
              <h2 className="mb-2 text-sm font-semibold text-neutral-700">
                Claude synthesis
              </h2>
              <p className="text-sm text-neutral-700">{current.claude.rationale}</p>
              <p className="mt-2 text-xs text-neutral-400">
                {current.claude.model} · {current.claude.latency_ms} ms
              </p>
            </section>
          </div>

          {/* Right: transcript */}
          <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Transcript ({p.records.length})
            </h2>
            <ol className="space-y-2">
              {p.records.map((r) => (
                <li
                  key={r.turn}
                  className="rounded-lg p-3 ring-1 ring-black/5"
                  style={{ backgroundColor: ALERT_META[r.alert.level].bg }}
                >
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span className="font-mono">
                      turn {r.turn} · {r.dominant_stage}
                    </span>
                    <span style={{ color: ALERT_META[r.alert.level].color }}>
                      {ALERT_META[r.alert.level].label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-800">{r.raw_text}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : (
        <p className="mt-10 text-center text-neutral-400">
          Pick a conversation above and press Play.
        </p>
      )}
    </main>
  );
}
