// Display helpers for session identifiers. A session_id is an opaque routing
// key (`imessage:<space>`, `imessage:thread-avery`, `demo-grooming-parent`);
// the console shows a friendly handle derived from it. Ground truth is never
// encoded here — test-feed handles are deliberately neutral.

export function sessionDisplayName(sessionId: string): string {
  let tail = sessionId.replace(/^imessage:/, "");

  // Real iMessage chat ids look like "any;-;+14086671882" or
  // "iMessage;-;user@example.com" — the handle (phone or email) is the last
  // ;-delimited segment. Show just that.
  if (tail.includes(";")) {
    return tail.split(";").filter(Boolean).pop() ?? sessionId;
  }

  // Test-feed / demo sessions: prettify the slug into a friendly handle.
  tail = tail
    .replace(/^thread-/, "")
    .replace(/^demo-/, "")
    .replace(/-(parent|tns)$/, "");
  const pretty = tail
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => (/[a-z]/.test(w[0]) ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
  return pretty || sessionId;
}

/** Stable initials for a session avatar. */
export function sessionInitials(sessionId: string): string {
  const name = sessionDisplayName(sessionId);
  // Phone-number handles → last two digits read better than "+1".
  const digits = name.replace(/\D/g, "");
  if (/^\+?\d[\d\s().-]*$/.test(name) && digits.length >= 2) {
    return digits.slice(-2);
  }
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
