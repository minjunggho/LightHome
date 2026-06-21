import type { AlertLevel, Stage } from "@/lib/api";

export const STAGE_META: Record<Stage, { label: string; color: string }> = {
  trust: { label: "Trust", color: "#10b981" },
  isolation: { label: "Isolation", color: "#f59e0b" },
  desensitization: { label: "Desensitization", color: "#f97316" },
  escalation: { label: "Escalation", color: "#ef4444" },
};

export const ALERT_META: Record<
  AlertLevel,
  { label: string; color: string; bg: string; ring: string }
> = {
  none: { label: "Normal", color: "#10b981", bg: "rgba(16,185,129,0.12)", ring: "#10b981" },
  watch: { label: "Watch", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", ring: "#f59e0b" },
  alert: { label: "Alert", color: "#ef4444", bg: "rgba(239,68,68,0.14)", ring: "#ef4444" },
};

export function harmfulMass(p: Record<Stage, number>): number {
  return p.isolation + p.desensitization + p.escalation;
}
