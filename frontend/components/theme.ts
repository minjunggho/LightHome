import type { AlertLevel, Stage } from "@/lib/api";

// Canonical risk metric lives in lib/analytics; re-exported here so existing
// component imports (`@/components/theme`) keep resolving.
export { harmfulMass } from "@/lib/analytics";

/* Tuned OKLCH ramps. Each role carries a `fill` (swatches, bars — sits on white
   or the rail) and a `text` (darkened so it clears AA as text on a light card).
   Color never carries meaning alone: every use is paired with a label + position.

   Stage arc is a single designed ramp — calm sea-green at Trust climbing through
   amber/orange to a sober red at Escalation, with monotonically rising warmth
   AND falling lightness so the steps stay distinguishable. */

export const STAGE_META: Record<
  Stage,
  { label: string; short: string; plain: string; fill: string; text: string }
> = {
  trust: {
    label: "Trust",
    short: "T",
    plain: "Friendly, building rapport",
    fill: "oklch(0.66 0.11 168)",
    text: "oklch(0.45 0.1 168)",
  },
  isolation: {
    label: "Isolation",
    short: "I",
    plain: "Pushing for secrecy, pulling away from others",
    fill: "oklch(0.76 0.14 82)",
    text: "oklch(0.5 0.11 70)",
  },
  desensitization: {
    label: "Desensitization",
    short: "D",
    plain: "Testing and crossing boundaries",
    fill: "oklch(0.67 0.16 50)",
    text: "oklch(0.5 0.16 45)",
  },
  escalation: {
    label: "Escalation",
    short: "E",
    plain: "Explicit or dangerous",
    fill: "oklch(0.58 0.21 26)",
    text: "oklch(0.52 0.21 26)",
  },
};

export const ALERT_META: Record<
  AlertLevel,
  { label: string; fill: string; text: string; bg: string; ring: string }
> = {
  none: {
    label: "Normal",
    fill: "oklch(0.66 0.11 168)",
    text: "oklch(0.44 0.1 168)",
    bg: "oklch(0.97 0.03 168)",
    ring: "oklch(0.8 0.07 168)",
  },
  watch: {
    label: "Watch",
    fill: "oklch(0.76 0.14 82)",
    text: "oklch(0.48 0.11 68)",
    bg: "oklch(0.97 0.04 82)",
    ring: "oklch(0.83 0.09 82)",
  },
  alert: {
    label: "Alert",
    fill: "oklch(0.58 0.21 26)",
    text: "oklch(0.51 0.21 26)",
    bg: "oklch(0.965 0.035 26)",
    ring: "oklch(0.78 0.12 26)",
  },
};
