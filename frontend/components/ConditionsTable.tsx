import type { AlertCondition } from "@/lib/api";

const LABELS: Record<string, string> = {
  harmful_mass: "Harmful mass",
  directionality: "Directionality",
  reciprocity: "Reciprocity",
  velocity: "Escalation velocity",
};

// The alert fires only when ALL conditions hold. This table is the on-screen
// "why it stayed green" — e.g. the teen case shows reciprocity failing the test.
export function ConditionsTable({
  conditions,
  reason,
}: {
  conditions: Record<string, AlertCondition>;
  reason?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg ring-1 ring-black/10">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-3 py-2 font-medium">Condition</th>
              <th className="px-3 py-2 font-medium tabular-nums">Value</th>
              <th className="px-3 py-2 font-medium">Test</th>
              <th className="px-3 py-2 font-medium">Met</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(conditions).map(([key, c]) => (
              <tr key={key} className="border-t border-black/5">
                <td className="px-3 py-2">{LABELS[key] ?? key}</td>
                <td className="px-3 py-2 font-mono tabular-nums">{c.value.toFixed(2)}</td>
                <td className="px-3 py-2 font-mono text-neutral-500">
                  {c.op} {c.threshold}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="font-semibold"
                    style={{ color: c.met ? "#ef4444" : "#10b981" }}
                  >
                    {c.met ? "✓ met" : "✗ no"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {reason && <p className="text-xs text-neutral-500">{reason}</p>}
    </div>
  );
}
