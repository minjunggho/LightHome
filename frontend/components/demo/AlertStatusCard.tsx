"use client";

import { CheckCircle2, ShieldAlert, ShieldQuestion } from "lucide-react";

import type { AlertLevel } from "@/lib/types";

const COPY: Record<
  AlertLevel,
  { title: string; tag: string; Icon: typeof CheckCircle2 }
> = {
  none: {
    title: "No structural risk detected",
    tag: "Calm",
    Icon: CheckCircle2,
  },
  watch: {
    title: "Watch: pattern is shifting",
    tag: "Caution",
    Icon: ShieldQuestion,
  },
  alert: {
    title: "Alert: high-risk pattern detected",
    tag: "High risk",
    Icon: ShieldAlert,
  },
};

/**
 * The alert state, as a premium dark card that transitions colour between
 * none / watch / alert and pulses when an alert fires.
 */
export function AlertStatusCard({
  level,
  guidance,
  compact = false,
}: {
  level: AlertLevel;
  guidance?: string;
  compact?: boolean;
}) {
  const { title, tag, Icon } = COPY[level];
  return (
    <div className={`alertcard ${level} ${compact ? "compact" : ""}`}>
      <div className="alertcard-glow" aria-hidden="true" />
      <div className="alertcard-top">
        <span className="alertcard-icon">
          <Icon size={compact ? 18 : 22} />
        </span>
        <span className="alertcard-tag">
          <span className="alertcard-pulse" />
          {tag}
        </span>
      </div>
      <h3 className="alertcard-title">{title}</h3>
      {guidance && !compact && <p className="alertcard-guidance">{guidance}</p>}
    </div>
  );
}
