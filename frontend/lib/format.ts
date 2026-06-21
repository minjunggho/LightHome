/** Seconds-from-start as m:ss, for the "minute 12 of 45" framing. */
export function mmss(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function pct(value: number): number {
  return Math.round(value * 100);
}
