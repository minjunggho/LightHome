import type { Features } from "@/lib/api";

function Meter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-neutral-600">{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums">
          {value.toFixed(2)}
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-neutral-700 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-400">{hint}</div>}
    </div>
  );
}

export function FeatureGrid({ features }: { features: Features }) {
  const br = features.boundary_recycle;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Meter label="Directionality" value={features.directionality} hint="one-sided questioning" />
      <Meter label="Reciprocity" value={features.reciprocity} hint="mutual disclosure" />
      <Meter label="Disclosure asymmetry" value={features.disclosure_asymmetry} />
      <Meter label="Escalation position" value={features.escalation_position} />
      <Meter label="Escalation velocity" value={features.escalation_velocity} hint="risk slope" />
      <div>
        <span className="text-sm text-neutral-600">Boundary recycling</span>
        <div className="mt-1 text-sm font-semibold" style={{ color: br.detected ? "#ef4444" : "#10b981" }}>
          {br.detected ? `detected · ${br.count}× · avg gap ${br.avg_gap_turns}` : "not detected"}
        </div>
      </div>
    </div>
  );
}
