export interface AuditRow {
  at: number;
  actor: string;
  type: string;
  label: string;
  data?: Record<string, string | number | boolean>;
}

/** Quotes every cell and defuses spreadsheet formulas in applicant-typed text. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function auditCsv(name: string, rows: AuditRow[]): string {
  const header = ["applicant", "time_utc", "actor", "event", "description", "details"];
  const lines = rows.map((r) =>
    [
      name,
      new Date(r.at).toISOString(),
      r.actor,
      r.type,
      r.label,
      Object.entries(r.data ?? {})
        .map(([k, v]) => `${k}=${v}`)
        .join("; "),
    ].map(csvCell),
  );
  return [header.map(csvCell), ...lines].map((cells) => cells.join(",")).join("\r\n");
}
