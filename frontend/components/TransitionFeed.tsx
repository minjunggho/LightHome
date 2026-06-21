import { type StageTransition, formatClock } from "@/lib/analytics";
import { STAGE_META } from "./theme";

/* Stage transitions as discrete events. The Trust → Isolation flip is the whole
   product thesis — shown as a moment with a clock, not an implied bar change. */
export function TransitionFeed({ transitions }: { transitions: StageTransition[] }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <h3 className="text-[15px] font-semibold text-ink">Key moments</h3>
      <p className="mt-0.5 text-xs text-ink-3">
        When the conversation changed character, and at what minute.
      </p>

      {transitions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-2">
          No turning points yet — the conversation has stayed the same so far.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {transitions.map((t, i) => {
            const from = STAGE_META[t.from];
            const to = STAGE_META[t.to];
            const escalating =
              ["trust", "isolation", "desensitization", "escalation"].indexOf(t.to) >
              ["trust", "isolation", "desensitization", "escalation"].indexOf(t.from);
            const keyMoment = t.from === "trust";
            return (
              <li key={`${t.index}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                {/* rail */}
                <div className="flex flex-col items-center">
                  <span
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface"
                    style={{ backgroundColor: to.fill }}
                  />
                  {i < transitions.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-line" />
                  )}
                </div>

                <div className="min-w-0 flex-1 -mt-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium">
                      <span style={{ color: from.text }}>{from.label}</span>
                      <span className="text-ink-3" aria-hidden="true">
                        {escalating ? "→" : "←"}
                      </span>
                      <span className="font-semibold" style={{ color: to.text }}>
                        {to.label}
                      </span>
                    </span>
                    <span className="tabular text-xs text-ink-3">
                      msg {t.turn} · {formatClock(t.tOffsetSec)}
                    </span>
                  </div>
                  {keyMoment && (
                    <span className="mt-1 inline-block rounded-md bg-brand-tint px-1.5 py-0.5 text-[11px] font-semibold text-brand-strong">
                      Turned from friendly to concerning
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
