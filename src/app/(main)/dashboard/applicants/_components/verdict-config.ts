import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";

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
  new: "",
  called: "Called, no outcome yet",
  confirmed: "Confirmed by phone",
  not_proceeding: "Not proceeding",
  sent: "Sent to PM",
} as const;
