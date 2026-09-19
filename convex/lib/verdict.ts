import { type CardStatus, type Flag, formatMonth, type ProviderStatus } from "./checks";

export type Consistency = "match" | "partial" | "conflict" | "skipped";

export interface CheckResults {
  provider: ProviderStatus;
  card: CardStatus;
  cardExpiresAt?: number;
  consistency: Consistency;
  safetyScore: number;
  flags: Flag[];
  formSeconds: number;
}

export interface Verdict {
  level: "green" | "amber";
  reasons: string[];
  moreCount: number;
  notes: string[];
  rank: number;
}

export const RANK = { amber: 0, green: 1, inProgress: 2 } as const;

// Severity order from R20. First three show on the card, the rest sit behind "+N more".
export function computeVerdict(c: CheckResults): Verdict {
  const expiry = c.cardExpiresAt === undefined ? "" : formatMonth(c.cardExpiresAt);
  const amber: (string | false)[] = [
    c.provider === "revoked" && "Training provider is on the revoked list",
    c.card === "expired" && `Safety card expired ${expiry}`,
    (c.provider === "no_card" || c.card === "none") && "No SST or OSHA 30 card on file",
    c.flags.includes("bot_trap_failed") && "Failed the bot-check question",
    c.consistency === "conflict" && "Check answers conflict with the application",
    c.flags.includes("form_too_fast") && `Form completed in ${Math.round(c.formSeconds)} seconds`,
    c.flags.includes("check_not_completed") && "Check not completed",
    c.safetyScore <= 1 && `Safety score ${c.safetyScore} of 3`,
    c.provider === "unknown" && "Training provider is not on the verified list",
    c.flags.includes("pasted_answers") && "Check answers were pasted",
  ];
  const reasons = amber.filter((r): r is string => r !== false);
  if (reasons.length > 0) {
    return {
      level: "amber",
      reasons: reasons.slice(0, 3),
      moreCount: Math.max(0, reasons.length - 3),
      notes: reasons.slice(3),
      rank: RANK.amber,
    };
  }
  const notes: string[] = [];
  if (c.card === "expiring") notes.push(`Card expires ${expiry}`);
  if (c.consistency === "partial") notes.push("Check answers were vague but did not contradict the application");
  return {
    level: "green",
    reasons: [
      "Training provider verified",
      `Card valid until ${expiry}`,
      c.consistency === "skipped"
        ? `Safety score ${c.safetyScore} of 3`
        : `Answers consistent, safety ${c.safetyScore} of 3`,
    ],
    moreCount: 0,
    notes,
    rank: RANK.green,
  };
}

export interface CountInput {
  level?: "green" | "amber";
  recruiterState: "new" | "called" | "confirmed" | "not_proceeding" | "sent";
}

/** AE8: only applicants with a verdict count; the rest are "in progress". */
export function countApplicants(rows: CountInput[]) {
  const decided = rows.filter((r) => r.level !== undefined);
  const needCall = decided.filter((r) => r.level === "amber" && ["new", "called"].includes(r.recruiterState)).length;
  const notProceeding = decided.filter((r) => r.recruiterState === "not_proceeding").length;
  return {
    total: decided.length,
    needCall,
    confirmed: decided.length - needCall - notProceeding,
    inProgress: rows.length - decided.length,
  };
}
