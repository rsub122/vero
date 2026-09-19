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

/** Board lanes follow the recruiter's steps. Cards move when a button is pressed, never by dragging. */
export const lanes = [
  { id: "call", title: "Needs a call", empty: "Nobody to call." },
  { id: "ready", title: "Ready for PM", empty: "Nobody waiting to send." },
  { id: "done", title: "Done", empty: "Nothing handed off yet." },
  { id: "checking", title: "In check", empty: "Nobody mid-check." },
] as const;

export type LaneId = (typeof lanes)[number]["id"];

export function laneOf(item: ApplicantItem): LaneId {
  if (!item.verdict) return "checking";
  if (item.recruiterState === "sent" || item.recruiterState === "not_proceeding") return "done";
  if (item.verdict.level === "amber" && (item.recruiterState === "new" || item.recruiterState === "called")) {
    return "call";
  }
  return "ready";
}
