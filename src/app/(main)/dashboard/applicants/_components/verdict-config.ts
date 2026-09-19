import type { FunctionReturnType } from "convex/server";
import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";

import type { api } from "@/convex/_generated/api";

export type ApplicantItem = FunctionReturnType<typeof api.recruiter.list>["items"][number];

// No reject state anywhere: amber means "a human should call", never "no".
export const verdictConfig: Record<"green" | "amber", { label: string; icon: LucideIcon; className: string }> = {
  green: {
    label: "No call needed",
    icon: CircleCheck,
    className:
      "border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300",
  },
  amber: {
    label: "Call this one",
    icon: CircleAlert,
    className:
      "border-amber-200 bg-amber-500/10 text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/15 dark:text-amber-300",
  },
};

export const recruiterStateLabel = {
  new: "New",
  called: "Called, no outcome yet",
  confirmed: "Confirmed by phone",
  not_proceeding: "Not proceeding",
  sent: "Sent to PM",
} as const;

/** Board lanes follow the recruiter's steps. Cards move by button or by drag; `boardMove` says what a drop means. */
export const lanes = [
  { id: "call", title: "Needs a call", empty: "Nobody to call." },
  { id: "ready", title: "Ready for PM", empty: "Nobody waiting to send." },
  { id: "done", title: "Done", empty: "Nothing handed off yet." },
  { id: "checking", title: "In check", empty: "Nobody mid-check." },
  { id: "bots", title: "Likely bots", empty: "No bots caught." },
] as const;

export type LaneId = (typeof lanes)[number]["id"];

type BoardItem = Pick<ApplicantItem, "verdict" | "recruiterState"> & { likelyBot?: boolean };

export function laneOf(item: BoardItem): LaneId {
  if (!item.verdict) return "checking";
  if (item.recruiterState === "sent" || item.recruiterState === "not_proceeding") return "done";
  if (item.verdict.level === "amber" && (item.recruiterState === "new" || item.recruiterState === "called")) {
    return item.likelyBot ? "bots" : "call";
  }
  return "ready";
}

export type BoardMove =
  | { kind: "none" }
  | { kind: "confirm" | "not_proceeding" | "send" | "reopen" }
  | { kind: "refuse"; reason: string };

const refuse = (reason: string): BoardMove => ({ kind: "refuse", reason });

/** What dropping a card on a lane means. Every lane pair has an answer, so no drop is silently ignored. */
export function boardMove(item: BoardItem, to: LaneId): BoardMove {
  const from = laneOf(item);
  if (from === to) return { kind: "none" };
  if (from === "checking") return refuse("Still taking the check. The card moves on its own when the verdict lands.");
  if (to === "checking") return refuse("Only applicants taking the check right now belong in In check.");
  if (to === "bots") return refuse("Only the check files likely bots: a very fast form plus a wrong random answer.");
  if (from === "bots" && to === "call") return refuse("Press Call anyway on the card to phone them yourself.");
  if (item.recruiterState === "sent") return refuse("Already sent to the PM and the foreman has the email.");
  if (to === "call") {
    return item.verdict?.level === "amber" ? { kind: "reopen" } : refuse("No call needed: every check passed.");
  }
  if (to === "ready") return { kind: "confirm" };
  return from === "ready" ? { kind: "send" } : { kind: "not_proceeding" };
}
