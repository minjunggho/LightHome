import type { AlertCondition } from "@/lib/api";

const LABELS: Record<string, string> = {
  harmful_mass: "Harmful mass",
  directionality: "Directionality",
  reciprocity: "Reciprocity",
  velocity: "Escalation velocity",
};

// Plain-language description shown under each technical condition name, so the
// table reads for a judge or non-analyst without losing the precise term.
const DESCRIPTIONS: Record<string, string> = {
  harmful_mass: "Share of risk in the concerning stages",
  directionality: "How one-sided the questions are",
  reciprocity: "Whether both people share back",
  velocity: "How fast it's escalating",
};

const MET = "oklch(0.58 0.21 26)"; // condition contributes to firing
const HELD = "oklch(0.5 0.1 168)"; // condition holds the line green

// The alert fires only when ALL FOUR conditions hold at once. This table is the
// on-screen "why it stayed green" — e.g. the teen case shows reciprocity failing
// the test, which is exactly what keeps a real relationship from being flagged.
export function ConditionsTable({
  conditions,
  reason,
}: {
  conditions: Record<string, AlertCondition>;
  reason?: string;
}) {
  const entries = Object.entries(conditions);
  const metCount = entries.filter(([, c]) => c.met).length;
  const total = entries.length;
  const fired = metCount === total;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink-2">
          <span className="tabular font-semibold text-ink">
            {metCount} / {total}
          </span>{" "}
          checks tripped
        </span>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{
            color: fired ? MET : HELD,
            backgroundColor: fired ? "oklch(0.965 0.035 26)" : "oklch(0.97 0.03 168)",
          }}
        >
          {fired ? "All four tripped → alert" : "A check held → stays green"}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="px-3.5 py-2.5 font-semibold">Check</th>
              <th className="px-3.5 py-2.5 text-right font-semibold">Value</th>
              <th className="px-3.5 py-2.5 font-semibold">Threshold</th>
              <th className="px-3.5 py-2.5 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, c]) => (
              <tr
                key={key}
                className="border-t border-line"
                style={!c.met ? { backgroundColor: "oklch(0.98 0.018 168)" } : undefined}
              >
                <td className="px-3.5 py-2.5">
                  <div className="font-medium text-ink">{LABELS[key] ?? key}</div>
                  {DESCRIPTIONS[key] && (
                    <div className="text-[11px] leading-snug text-ink-3">{DESCRIPTIONS[key]}</div>
                  )}
                </td>
                <td className="tabular px-3.5 py-2.5 text-right align-top font-semibold text-ink">
                  {c.value.toFixed(2)}
                </td>
                <td className="tabular px-3.5 py-2.5 align-top font-mono text-xs text-ink-3">
                  {c.op} {c.threshold}
                </td>
                <td className="px-3.5 py-2.5 text-right align-top">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-semibold"
                    style={{ color: c.met ? MET : HELD }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: c.met ? MET : HELD }}
                    />
                    {c.met ? "tripped" : "held"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reason && <p className="text-xs leading-relaxed text-ink-2">{reason}</p>}
    </div>
  );
}
