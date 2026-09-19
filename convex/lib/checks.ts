import { CARD_EXPIRING_MONTHS, CARD_VALID_YEARS, FORM_MIN_SECONDS } from "./constants";

export type ProviderStatus = "clear" | "revoked" | "unknown" | "no_card";
export type CardStatus = "valid" | "expiring" | "expired" | "none";
export type Flag = "form_too_fast" | "pasted_answers" | "bot_trap_failed" | "check_not_completed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Turner Safety, LLC." and "turner safety" share one key. */
export function normalizeProvider(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !["llc", "inc", "corp", "co", "ltd"].includes(word))
    .join(" ");
}

function parseDay(isoDay: string): number {
  const [y, m, d] = isoDay.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function isValidPastDay(isoDay: string, now: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return false;
  const ms = parseDay(isoDay);
  return Number.isFinite(ms) && ms <= now;
}

export function formatMonth(ms: number): string {
  const date = new Date(ms);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function cardCheck(issueDay: string | undefined, now: number): { status: CardStatus; expiresAt?: number } {
  if (!issueDay) return { status: "none" };
  const issued = new Date(parseDay(issueDay));
  const expiresAt = Date.UTC(issued.getUTCFullYear() + CARD_VALID_YEARS, issued.getUTCMonth(), issued.getUTCDate());
  if (now >= expiresAt) return { status: "expired", expiresAt };
  const expiry = new Date(expiresAt);
  const warnFrom = Date.UTC(expiry.getUTCFullYear(), expiry.getUTCMonth() - CARD_EXPIRING_MONTHS, expiry.getUTCDate());
  return { status: now >= warnFrom ? "expiring" : "valid", expiresAt };
}

/**
 * Both bot signals at once: a form faster than a person can read it and a wrong answer to "two plus two".
 * One signal alone stays a normal amber call, since fast workers and weak readers trip one each.
 */
export function isLikelyBot(flags: readonly string[]): boolean {
  return flags.includes("form_too_fast") && flags.includes("bot_trap_failed");
}

export function botTrapOk(value: string, accepted: readonly string[]): boolean {
  return accepted.includes(value.trim().toLowerCase());
}

/** Expired safety answers count as incorrect. */
export function safetyScore(answers: { kind: string; correct?: boolean; expired: boolean }[]): number {
  return answers.filter((a) => a.kind === "safety" && a.correct === true && !a.expired).length;
}

export function behaviorFlags(input: {
  startedAt: number;
  submittedAt: number;
  botTrapPassed: boolean;
  claimAnswerPasted: boolean;
  completed: boolean;
}): Flag[] {
  const flags: Flag[] = [];
  if ((input.submittedAt - input.startedAt) / 1000 < FORM_MIN_SECONDS) flags.push("form_too_fast");
  if (input.claimAnswerPasted) flags.push("pasted_answers");
  // An unfinished check already says why; a missing bot-trap answer is not a failed one.
  if (input.completed && !input.botTrapPassed) flags.push("bot_trap_failed");
  if (!input.completed) flags.push("check_not_completed");
  return flags;
}
