import { ALERT_META } from "./theme";
import type { AlertLevel } from "@/lib/api";

/** A small pulsing "live" indicator. Tone follows alert level; a label always
 *  accompanies the color (status is never color-only). */
export function LiveDot({
  level = "none",
  label = "Live",
}: {
  level?: AlertLevel;
  label?: string;
}) {
  const tone = ALERT_META[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
      <span className="relative flex h-2 w-2">
        <span
          className="lh-blip absolute inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: tone.fill }}
        />
      </span>
      {label}
    </span>
  );
}
