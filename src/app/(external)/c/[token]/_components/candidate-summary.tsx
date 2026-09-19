"use client";

import { useEffect } from "react";

import { cn } from "cn";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export function CandidateSummary({ token }: { token: string }) {
  const candidate = useQuery(api.handoff.candidate, { shareToken: token });
  const logView = useMutation(api.handoff.logCandidateView);

  useEffect(() => {
    if (candidate) void logView({ shareToken: token }).catch(() => undefined);
  }, [candidate, token, logView]);

  if (candidate === undefined) return <Skeleton className="h-80 w-full rounded-xl" />;
  if (candidate === null) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>Link not found</EmptyTitle>
          <EmptyDescription>This candidate link is not valid. Ask the recruiter to send it again.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const facts: [string, string][] = [
    ["Years in trade", String(candidate.yearsInTrade)],
    ["Last employer", candidate.lastEmployer],
    ["Can start", format(new Date(`${candidate.startDate}T12:00:00`), "EEE, MMM d")],
    ["Own transport", candidate.hasTransport ? "Yes" : "No"],
  ];

  return (
    <>
      <p className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-5" aria-hidden="true" />
        Vero
      </p>
      <Card>
        <CardHeader>
          <CardDescription>
            {candidate.company} · {candidate.jobTitle}
          </CardDescription>
          <CardTitle className="text-2xl">{candidate.name}</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "w-fit rounded-md",
              "border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300",
            )}
          >
            {candidate.confirmedByCall ? "Confirmed by recruiter call" : "Pre-check passed"}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex flex-col gap-1.5 text-sm">
            {[...candidate.reasons, ...candidate.notes].map((reason) => (
              <li key={reason} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                {reason}
              </li>
            ))}
          </ul>
          <Separator />
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <p className="text-center text-muted-foreground text-xs">Read-only summary shared by the recruiter.</p>
    </>
  );
}
