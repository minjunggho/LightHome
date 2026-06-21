import type { Stage, StageProbabilities } from "@/lib/api";
import { STAGES } from "@/lib/api";
import { STAGE_META } from "./theme";

function Segments({
  probs,
  faded,
  labelled,
}: {
  probs: StageProbabilities;
  faded?: boolean;
  labelled?: boolean;
}) {
  return (
    <div
      className="flex h-full w-full gap-px overflow-hidden rounded-xl bg-surface-2"
      style={{ opacity: faded ? 0.4 : 1 }}
    >
      {STAGES.map((s) => {
        const pct = Math.max(0, probs[s]) * 100;
        return (
          <div
            key={s}
            className="relative h-full transition-[flex-grow] duration-700 ease-out"
            style={{ flexGrow: pct, flexBasis: 0, backgroundColor: STAGE_META[s].fill }}
            title={`${STAGE_META[s].label}: ${pct.toFixed(0)}%`}
          >
            {labelled && pct >= 9 && (
              <span className="tabular absolute inset-0 grid place-items-center text-[11px] font-bold text-white/95">
                {pct.toFixed(0)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProbabilityBar({
  prior,
  posterior,
  plain = false,
}: {
  prior?: StageProbabilities;
  posterior: StageProbabilities;
  /** show a plain-language description under each stage name (parent view) */
  plain?: boolean;
}) {
  const dominant = STAGES.reduce<Stage>(
    (best, s) => (posterior[s] > posterior[best] ? s : best),
    "trust",
  );

  return (
    <div className="space-y-4">
      <div className="h-12">
        <Segments probs={posterior} labelled />
      </div>

      {prior && (
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-[11px] font-medium uppercase tracking-wide text-ink-3">
            {plain ? "A moment ago" : "Prior"}
          </span>
          <div className="h-2 flex-1">
            <Segments probs={prior} faded />
          </div>
          <span className="text-[11px] text-ink-3">before this message</span>
        </div>
      )}

      <div
        className={
          plain
            ? "grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            : "grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4"
        }
      >
        {STAGES.map((s) => {
          const isDom = s === dominant;
          return (
            <div key={s} className="flex items-start gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: STAGE_META[s].fill }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`truncate text-[13px] ${
                      isDom ? "font-semibold text-ink" : "text-ink-2"
                    }`}
                  >
                    {STAGE_META[s].label}
                  </span>
                  <span
                    className="tabular text-[13px] font-semibold"
                    style={{ color: isDom ? STAGE_META[s].text : "var(--ink-2)" }}
                  >
                    {(posterior[s] * 100).toFixed(0)}%
                  </span>
                </div>
                {plain && (
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-3">
                    {STAGE_META[s].plain}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
