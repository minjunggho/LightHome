import type { Features } from "@/lib/api";

function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="tabular text-[13px] font-semibold text-ink">{value.toFixed(2)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <div className="mt-1 text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

export function FeatureGrid({ features }: { features: Features }) {
  const br = features.boundary_recycle;
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      <Meter label="Directionality" value={features.directionality} hint="how one-sided the questions are" />
      <Meter label="Reciprocity" value={features.reciprocity} hint="whether both people share back" />
      <Meter label="Disclosure asymmetry" value={features.disclosure_asymmetry} hint="who reveals more about themselves" />
      <Meter label="Escalation position" value={features.escalation_position} hint="how far along the grooming arc" />
      <Meter label="Escalation velocity" value={features.escalation_velocity} hint="how fast the risk is rising" />
      <div className="rounded-xl bg-surface-sunken p-3">
        <span className="text-[13px] font-medium text-ink">Boundary recycling</span>
        <div
          className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold"
          style={{ color: br.detected ? "oklch(0.52 0.21 26)" : "oklch(0.45 0.1 168)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: br.detected ? "oklch(0.58 0.21 26)" : "oklch(0.6 0.11 168)" }}
          />
          {br.detected
            ? `detected · ${br.count}× · avg gap ${br.avg_gap_turns} turns`
            : "not detected"}
        </div>
        <div className="mt-1 text-[11px] text-ink-3">the same boundary pushed again and again</div>
      </div>
    </div>
  );
}
