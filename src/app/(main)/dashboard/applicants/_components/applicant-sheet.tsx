"use client";

import { cn } from "cn";
import { useMutation, useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Clock, Globe, Mail } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";

import { ApplicantAction } from "./applicant-action";
import { AuditLog } from "./audit-log";
import { applicationTiming, formatDuration } from "./timing";
import { type ApplicantItem, verdictConfig } from "./verdict-config";

export function VerdictBadge({ level }: { level?: "green" | "amber" }) {
  if (!level) {
    return (
      <Badge variant="outline" className="gap-1.5 rounded-md px-2 font-normal text-muted-foreground">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" aria-hidden="true" />
        In check
      </Badge>
    );
  }
  const { label, icon: Icon, className } = verdictConfig[level];
  return (
    <Badge variant="outline" className={cn("shrink-0 gap-1 rounded-md px-2 font-medium", className)}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}

export function applicantMeta(item: ApplicantItem) {
  return [
    item.yearsInTrade !== undefined && `${item.yearsInTrade} ${item.yearsInTrade === 1 ? "yr" : "yrs"}`,
    item.lastEmployer,
    formatDistanceToNow(item.submittedAt, { addSuffix: true }),
    item.language === "es" && "Español",
  ]
    .filter(Boolean)
    .join(" · ");
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const RESULT_STYLE: Record<string, string> = {
  match: verdictConfig.green.className,
  conflict: verdictConfig.amber.className,
};

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 text-lg tabular-nums leading-none tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-medium text-sm">{children}</h3>;
}

function Details({ item, passcode }: { item: ApplicantItem; passcode: string }) {
  const retryEmail = useMutation(api.handoff.retryEmail);
  // Same subscription as the Audit log tab, so Convex shares it; timing is read off the audit trail.
  const events = useQuery(api.recruiter.auditLog, { passcode, applicantId: item.id });
  const timing = applicationTiming(events ?? []);
  const verdict = item.verdict;

  return (
    <div className="flex flex-col gap-6 text-sm">
      <section className="flex flex-col gap-3">
        <Heading>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
            Time taken
          </span>
        </Heading>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Form" value={events ? formatDuration(timing.formMs) : "…"} />
          <Stat label="Timed check" value={events ? formatDuration(timing.checkMs) : "…"} />
          <Stat label="Total" value={events ? formatDuration(timing.totalMs) : "…"} />
          <Stat label="Safety" value={item.safetyScore === undefined ? "—" : `${item.safetyScore} of 3`} />
        </div>
      </section>

      {!verdict ? (
        <p className="text-muted-foreground">{item.step}. The verdict appears here when the check ends.</p>
      ) : (
        <section className="flex flex-col gap-3">
          <Heading>Why this verdict</Heading>
          <ul className="flex flex-col gap-2">
            {verdict.reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5">
                <span
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    verdict.level === "amber" ? "bg-amber-500" : "bg-green-500",
                  )}
                  aria-hidden="true"
                />
                {reason}
              </li>
            ))}
            {verdict.notes.map((note) => (
              <li key={note} className="flex gap-2.5 text-muted-foreground">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.consistency && item.consistency.source !== "none" && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Heading>Answer check</Heading>
            <Badge variant="outline" className={cn("rounded-md capitalize", RESULT_STYLE[item.consistency.result])}>
              {item.consistency.result}
              {item.consistency.source === "fallback" && " · keyword fallback"}
            </Badge>
          </div>
          {item.consistency.reason && (
            <p className="text-muted-foreground leading-relaxed">{item.consistency.reason}</p>
          )}
          <ol className="flex flex-col gap-3">
            {item.claims.map((claim, i) => (
              <li key={claim.question} className="flex flex-col gap-2 rounded-lg border p-4">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Question {i + 1}</p>
                <p className="leading-relaxed">{claim.question}</p>
                <blockquote className="whitespace-pre-wrap break-words border-l-2 pl-3 font-medium leading-relaxed">
                  {claim.answer || <span className="font-normal text-muted-foreground">No answer</span>}
                </blockquote>
              </li>
            ))}
          </ol>
        </section>
      )}

      {item.webFindings && (
        <section className="flex flex-col gap-2 rounded-lg border border-dashed p-4">
          <Heading>
            <span className="flex items-center gap-1.5">
              <Globe className="size-4" aria-hidden="true" />
              Web findings, unverified
            </span>
          </Heading>
          <p className="text-muted-foreground leading-relaxed">{item.webFindings.summary}</p>
          <div className="flex flex-wrap gap-x-3 text-xs">
            {item.webFindings.sources.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                {hostname(url)}
              </a>
            ))}
          </div>
        </section>
      )}

      {item.recruiterState === "sent" && (
        <section className="flex flex-col gap-2 rounded-lg bg-muted/40 p-4">
          <Heading>Hand-off</Heading>
          <p className="text-muted-foreground leading-relaxed">{item.atsNote?.note ?? "Waiting for the ATS…"}</p>
          <p className="flex items-center gap-1.5">
            <Mail className="size-4" aria-hidden="true" />
            {item.emailState === "sent" && "Foreman emailed"}
            {item.emailState === "pending" && "Emailing the foreman…"}
            {item.emailState === "failed" && (
              <>
                <span className="text-destructive">Email failed</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() =>
                    void retryEmail({ passcode, applicantId: item.id }).catch(() => toast.error("Retry failed"))
                  }
                >
                  Retry
                </Button>
              </>
            )}
          </p>
        </section>
      )}
    </div>
  );
}

interface ApplicantSheetProps {
  item: ApplicantItem | undefined;
  passcode: string;
  onOpenChange: (open: boolean) => void;
}

export function ApplicantSheet({ item, passcode, onOpenChange }: ApplicantSheetProps) {
  return (
    <Sheet open={item !== undefined} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        {item && (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-start justify-between gap-3 pr-8">
                <SheetTitle className="text-lg">{item.name}</SheetTitle>
                <VerdictBadge level={item.verdict?.level} />
              </div>
              <SheetDescription>{applicantMeta(item)}</SheetDescription>
            </SheetHeader>
            <Tabs defaultValue="details" className="min-h-0 flex-1 gap-4 overflow-y-auto p-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="audit">Audit log</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <Details item={item} passcode={passcode} />
              </TabsContent>
              <TabsContent value="audit">
                <AuditLog passcode={passcode} applicantId={item.id} name={item.name} />
              </TabsContent>
            </Tabs>
            <SheetFooter className="flex-row items-center justify-end border-t">
              <ApplicantAction item={item} passcode={passcode} />
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
