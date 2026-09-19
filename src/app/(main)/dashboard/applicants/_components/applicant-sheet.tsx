"use client";

import { cn } from "cn";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { Globe, Mail } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";

import { ApplicantAction } from "./applicant-action";
import { AuditLog } from "./audit-log";
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

function Details({ item, passcode }: { item: ApplicantItem; passcode: string }) {
  const retryEmail = useMutation(api.handoff.retryEmail);
  const verdict = item.verdict;
  if (!verdict)
    return <p className="text-muted-foreground text-sm">{item.step}. The verdict appears here when the check ends.</p>;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <ul className="flex flex-col gap-1.5">
        {verdict.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span
              className={cn(
                "mt-2 size-1.5 shrink-0 rounded-full",
                verdict.level === "amber" ? "bg-amber-500" : "bg-green-500",
              )}
              aria-hidden="true"
            />
            {reason}
          </li>
        ))}
        {verdict.notes.map((note) => (
          <li key={note} className="flex gap-2 text-muted-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
            {note}
          </li>
        ))}
      </ul>

      {item.consistency && item.consistency.source !== "none" && (
        <section className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-xs">
          <p>
            <span className="font-medium">Answer check: {item.consistency.result}</span>
            {item.consistency.source === "fallback" && " (keyword fallback)"}
            {item.consistency.reason && <span className="text-muted-foreground"> · {item.consistency.reason}</span>}
          </p>
          {item.claims.map((claim) => (
            <div key={claim.question}>
              <p className="text-muted-foreground">{claim.question}</p>
              <p className="whitespace-pre-wrap break-words">“{claim.answer || "no answer"}”</p>
            </div>
          ))}
        </section>
      )}

      {item.webFindings && (
        <section className="flex flex-col gap-1.5 rounded-lg border border-dashed p-3 text-xs">
          <p className="flex items-center gap-1.5 font-medium">
            <Globe className="size-3.5" aria-hidden="true" />
            Web findings, unverified
          </p>
          <p className="text-muted-foreground">{item.webFindings.summary}</p>
          <div className="flex flex-wrap gap-x-3">
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
        <section className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-xs">
          <p className="font-medium">ATS note</p>
          <p className="text-muted-foreground">{item.atsNote?.note ?? "Waiting for the ATS…"}</p>
          <p className="flex items-center gap-1.5">
            <Mail className="size-3.5" aria-hidden="true" />
            {item.emailState === "sent" && "Foreman emailed"}
            {item.emailState === "pending" && "Emailing the foreman…"}
            {item.emailState === "failed" && (
              <>
                <span className="text-destructive">Email failed</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
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
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
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
