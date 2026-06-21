import type { DecisionRecord } from "@/lib/api";
import { formatClock, harmfulMass } from "@/lib/analytics";
import { ALERT_META, STAGE_META } from "./theme";

/* The exact messages that tripped a structural signal, with the signal(s) that
   flagged each. This surfaces raw content — it is the analyst (T&S) capability
   brought onto the parent drill-in by product decision; the privacy projection
   on the API is unchanged, this page just consumes the `tns` view. */

const SIGNAL_LABELS: Record<string, string> = {
  directionality: "Mostly one-sided questions",
  reciprocity: "Not sharing back",
  velocity: "Getting intense quickly",
  harmful_mass: "Getting riskier",
};

/** Human-readable signals that concern us on this message. */
export function messageSignals(rec: DecisionRecord): string[] {
  const out: string[] = [];
  for (const [key, c] of Object.entries(rec.alert.conditions)) {
    if (c.met && SIGNAL_LABELS[key]) out.push(SIGNAL_LABELS[key]);
  }
  if (rec.features.boundary_recycle.detected) out.push("Repeated push for secrecy");
  return out;
}

/** A message is flagged if it carries real structural risk — an alert level, a
 *  recycled boundary, concentrated risk mass, or ≥2 met conditions. Benign
 *  greetings stay unflagged. */
export function isFlagged(rec: DecisionRecord): boolean {
  if (rec.alert.level !== "none") return true;
  if (rec.features.boundary_recycle.detected) return true;
  if (harmfulMass(rec.stage_probabilities) >= 0.35) return true;
  const met = Object.values(rec.alert.conditions).filter((c) => c.met).length;
  return met >= 2;
}

export function FlaggedMessages({ records }: { records: DecisionRecord[] }) {
  const flagged = records.filter(isFlagged);

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">Flagged messages</h3>
        <span className="tabular text-xs text-ink-3">
          {flagged.length} of {records.length} message{records.length === 1 ? "" : "s"}
        </span>
      </div>

      {flagged.length === 0 ? (
        <p className="mt-3 text-sm text-ink-2">
          No suspicious messages yet — every message so far reads as a normal,
          reciprocal exchange.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {flagged.map((rec) => {
            const tone = ALERT_META[rec.alert.level];
            const stage = STAGE_META[rec.dominant_stage];
            const signals = messageSignals(rec);
            return (
              <li
                key={rec.turn}
                className="rounded-2xl border border-line bg-surface-2 p-4"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide"
                    style={{ color: tone.text }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tone.fill }}
                    />
                    {tone.label}
                  </span>
                  <span className="tabular text-ink-3">
                    msg {rec.turn} · {formatClock(rec.t_offset_sec)}
                  </span>
                </div>

                <p className="mt-2 text-[15px] leading-relaxed text-ink">
                  &ldquo;{rec.raw_text}&rdquo;
                </p>

                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-medium"
                    style={{ color: stage.text }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: stage.fill }}
                    />
                    {stage.label}
                  </span>

                  {signals.map((s) => (
                    <span
                      key={s}
                      className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: tone.bg, color: tone.text }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
