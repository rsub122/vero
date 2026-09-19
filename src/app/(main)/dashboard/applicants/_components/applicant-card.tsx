"use client";

import { useState } from "react";

import { cn } from "cn";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import { FileClock, Globe, Mail, Phone, Send } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { AuditSheet } from "./audit-sheet";
import { CallDialog } from "./call-dialog";
import { recruiterStateLabel, verdictConfig } from "./verdict-config";

type RecruiterState = keyof typeof recruiterStateLabel;

export interface ApplicantItem {
  id: Id<"applicants">;
  name: string;
  step: string;
  submittedAt: number;
  yearsInTrade?: number;
  lastEmployer?: string;
  lastSite?: string;
  language: "en" | "es";
  verdict?: { level: "green" | "amber"; reasons: string[]; moreCount: number; notes: string[] };
  recruiterState: RecruiterState;
  emailState?: "pending" | "sent" | "failed";
  consistency?: { result: string; reason?: string; source: string };
  claims: { question: string; answer: string }[];
  atsNote?: { note: string; receivedAt: number };
  webFindings?: { summary: string; sources: string[] };
}

function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Grey row for someone who submitted the form but has no verdict yet (R24). */
export function InProgressRow({ item }: { item: ApplicantItem }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-muted-foreground">
      <span className="min-w-0 truncate font-medium text-sm">{item.name}</span>
      <span className="flex shrink-0 items-center gap-2 text-xs">
        <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" aria-hidden="true" />
        {item.step}
      </span>
    </article>
  );
}

export function ApplicantCard({ item, passcode }: { item: ApplicantItem; passcode: string }) {
  const [showMore, setShowMore] = useState(false);
  const [calling, setCalling] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const sendToPm = useMutation(api.handoff.sendToPm);
  const retryEmail = useMutation(api.handoff.retryEmail);
  if (!item.verdict) return <InProgressRow item={item} />;

  const verdict = verdictConfig[item.verdict.level];
  const VerdictIcon = verdict.icon;
  const state = item.recruiterState;
  const action =
    item.verdict.level === "amber" && (state === "new" || state === "called")
      ? "call"
      : state === "sent" || state === "not_proceeding"
        ? null
        : "send";
  const extra = showMore ? item.verdict.notes : item.verdict.level === "green" ? item.verdict.notes : [];

  const send = async () => {
    await sendToPm({ passcode, applicantId: item.id })
      .then(() => toast.success(`${item.name} sent to the PM`))
      .catch(() => toast.error("Could not send to the PM"));
  };

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-xs",
        state === "not_proceeding" && "opacity-70",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-medium leading-none">{item.name}</h3>
          <p className="truncate text-muted-foreground text-xs">
            {item.yearsInTrade} yrs · {item.lastEmployer} · {formatDistanceToNow(item.submittedAt, { addSuffix: true })}
            {item.language === "es" && " · Español"}
          </p>
        </div>
        <Badge variant="outline" className={cn("shrink-0 gap-1 rounded-md px-2 font-medium", verdict.className)}>
          <VerdictIcon aria-hidden="true" />
          {verdict.label}
        </Badge>
      </header>

      <ul className="flex flex-col gap-1.5 text-sm">
        {item.verdict.reasons.map((reason) => (
          <li key={reason} className="flex gap-2">
            <span
              className={cn(
                "mt-2 size-1.5 shrink-0 rounded-full",
                item.verdict?.level === "amber" ? "bg-amber-500" : "bg-green-500",
              )}
              aria-hidden="true"
            />
            {reason}
          </li>
        ))}
        {extra.map((note) => (
          <li key={note} className="flex gap-2 text-muted-foreground">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
            {note}
          </li>
        ))}
      </ul>
      {item.verdict.moreCount > 0 && (
        <Button
          variant="link"
          size="sm"
          className="h-auto self-start p-0 text-xs"
          onClick={() => setShowMore((v) => !v)}
        >
          {showMore ? "Show less" : `+${item.verdict.moreCount} more`}
        </Button>
      )}

      {item.consistency && item.consistency.source !== "none" && (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-xs">
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
        </div>
      )}

      {item.webFindings && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed p-3 text-xs">
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
        </div>
      )}

      {state === "sent" && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-xs">
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
        </div>
      )}

      <Separator />
      <footer className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAuditOpen(true)}>
          <FileClock aria-hidden="true" />
          Audit log
        </Button>
        {action === "call" && (
          <Button size="sm" onClick={() => setCalling(true)}>
            <Phone aria-hidden="true" />
            Call
          </Button>
        )}
        {action === "send" && (
          <Button size="sm" onClick={() => void send()}>
            <Send aria-hidden="true" />
            Send to PM
          </Button>
        )}
        {action === null && <span className="text-muted-foreground text-xs">{recruiterStateLabel[state]}</span>}
      </footer>

      <CallDialog passcode={passcode} applicantId={item.id} name={item.name} open={calling} onOpenChange={setCalling} />
      <AuditSheet
        passcode={passcode}
        applicantId={item.id}
        name={item.name}
        open={auditOpen}
        onOpenChange={setAuditOpen}
      />
    </article>
  );
}
