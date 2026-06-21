import type { ParentView, Stage } from "@/lib/api";
import { biggestMover } from "@/lib/analytics";
import { STAGE_META } from "./theme";

// Plain adjective per stage, so the change reads as a natural sentence
// ("More secretive") instead of the clinical noun.
const ADJECTIVE: Record<Stage, string> = {
  trust: "friendly",
  isolation: "secretive",
  desensitization: "boundary-pushing",
  escalation: "explicit",
};

/* "What just changed" — the single stage that moved most between the previous
   message and this one. Lets a parent see the read react, message by message. */
export function WhatChanged({ record }: { record: ParentView }) {
  const { stage, delta } = biggestMover(
    record.prior_probabilities,
    record.stage_probabilities,
  );
  const meta = STAGE_META[stage];
  const pts = Math.round(delta * 100);
  const rising = delta >= 0;
  const negligible = Math.abs(pts) < 1;

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <h3 className="text-[15px] font-semibold text-ink">What just changed</h3>

      {negligible ? (
        <p className="mt-2 text-sm text-ink-2">
          Not much — this message didn&apos;t really change the picture.
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: meta.fill }}
            aria-hidden="true"
          >
            {meta.short}
          </span>
          <div className="min-w-0">
            <div
              className="text-[1.15rem] font-semibold leading-tight"
              style={{ color: meta.text }}
            >
              {rising ? "More" : "Less"} {ADJECTIVE[stage]}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-2">{meta.plain}</p>
          </div>
        </div>
      )}
    </section>
  );
}
