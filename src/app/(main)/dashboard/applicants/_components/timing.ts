interface TimedEvent {
  type: string;
  at: number;
}

/** How long each part took, read off the audit trail. Undefined when a step never happened. */
export function applicationTiming(events: TimedEvent[]) {
  const at = (type: string) => events.find((e) => e.type === type)?.at;
  const opened = at("application_started");
  const submitted = at("form_submitted");
  const started = at("check_started");
  const ended = at("check_completed") ?? at("check_abandoned");
  const span = (from?: number, to?: number) => (from !== undefined && to !== undefined ? to - from : undefined);
  return { formMs: span(opened, submitted), checkMs: span(started, ended), totalMs: span(opened, ended) };
}

export function formatDuration(ms?: number) {
  if (ms === undefined) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}
