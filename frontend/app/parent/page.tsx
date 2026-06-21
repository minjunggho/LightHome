"use client";

import Link from "next/link";

import { AlertBadge } from "@/components/AlertBadge";
import { PlayerControls } from "@/components/PlayerControls";
import { ProbabilityBar } from "@/components/ProbabilityBar";
import { StageTimeline, type TimelinePoint } from "@/components/StageTimeline";
import type { ParentView } from "@/lib/api";
import { usePlayer } from "@/lib/usePlayer";

export default function ParentDashboard() {
  const p = usePlayer<ParentView>("parent");
  const current = p.records[p.records.length - 1] ?? null;

  const points: TimelinePoint[] = p.records.map((r, i) => ({
    turn: i + 1,
    level: r.alert.level,
    dominant: r.dominant_stage,
    posterior: r.stage_probabilities,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lighthome — Parent view</h1>
          <p className="text-sm text-neutral-500">
            The shape of the conversation. Messages are never shown here.
          </p>
        </div>
        <Link href="/platform" className="text-sm text-neutral-500 underline">
          T&amp;S view →
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
        <div className="mt-6 space-y-6">
          <AlertBadge level={current.alert.level} guidance={current.guidance} />
          <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
            <ProbabilityBar
              prior={current.prior_probabilities}
              posterior={current.stage_probabilities}
            />
          </section>
          <section className="rounded-xl bg-white p-5 ring-1 ring-black/10">
            <StageTimeline points={points} />
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
