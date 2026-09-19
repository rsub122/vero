import { cn } from "cn";
import { CircleAlert, CircleCheck, PhoneOff, Users } from "lucide-react";

import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

import type { ApplicantItem } from "./verdict-config";

interface Counts {
  total: number;
  needCall: number;
  confirmed: number;
  likelyBots: number;
  inProgress: number;
}

/** The AE8 counter ("14 applicants. 3 need a call. 11 confirmed.") as the dashboard's KPI cards. */
export function KpiStrip({ counts, items }: { counts: Counts; items: ApplicantItem[] }) {
  const sent = items.filter((i) => i.recruiterState === "sent").length;
  const noCall = items.filter((i) => i.verdict?.level === "green").length + counts.likelyBots;
  const pct = counts.total ? Math.round((noCall / counts.total) * 100) : 0;
  const cards = [
    { label: "Applicants", value: counts.total, icon: Users, note: `${counts.inProgress} taking the check now` },
    {
      label: "Need a call",
      value: counts.needCall,
      icon: CircleAlert,
      note: `${counts.likelyBots} likely ${counts.likelyBots === 1 ? "bot" : "bots"} filtered out`,
      className: "text-amber-700 dark:text-amber-300",
    },
    { label: "Confirmed", value: counts.confirmed, icon: CircleCheck, note: `${sent} sent to the PM` },
    { label: "Calls saved", value: noCall, icon: PhoneOff, note: `${pct}% cleared without a phone call` },
  ];

  return (
    <section aria-label="Applicant totals" aria-live="polite" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, note, className }) => (
        <Card key={label} size="sm">
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardAction>
              <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className={cn("text-3xl tabular-nums leading-none tracking-tight", className)}>{value}</p>
            <p className="truncate text-muted-foreground text-xs">{note}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
