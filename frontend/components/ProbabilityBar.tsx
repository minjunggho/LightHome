import type { StageProbabilities } from "@/lib/api";
import { STAGES } from "@/lib/api";
import { STAGE_META } from "./theme";

function Bar({ probs, faded }: { probs: StageProbabilities; faded?: boolean }) {
  return (
    <div
      className="flex h-full w-full overflow-hidden rounded-md"
      style={{ opacity: faded ? 0.35 : 1 }}
    >
      {STAGES.map((s) => {
        const pct = Math.max(0, probs[s]) * 100;
        return (
          <div
            key={s}
            className="h-full transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%`, backgroundColor: STAGE_META[s].color }}
            title={`${STAGE_META[s].label}: ${pct.toFixed(0)}%`}
          />
        );
      })}
    </div>
  );
}

export function ProbabilityBar({
  prior,
  posterior,
}: {
  prior?: StageProbabilities;
  posterior: StageProbabilities;
}) {
  return (
    <div className="space-y-3">
      {prior && (
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
            Prior (before this message)
          </div>
          <div className="h-3">
            <Bar probs={prior} faded />
          </div>
        </div>
      )}
      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
          Current stage distribution
        </div>
        <div className="h-10 ring-1 ring-black/10 rounded-md">
          <Bar probs={posterior} />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1">
        {STAGES.map((s) => (
          <div key={s} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: STAGE_META[s].color }}
            />
            <span className="text-neutral-600">{STAGE_META[s].label}</span>
            <span className="font-mono font-semibold tabular-nums">
              {(posterior[s] * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
