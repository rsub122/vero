"use client";

import { useState } from "react";

import { cn } from "cn";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { Languages } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";

import { type ApplicantItem, verdictConfig } from "./verdict-config";

const RESULT_STYLE: Record<string, string> = {
  match: verdictConfig.green.className,
  conflict: verdictConfig.amber.className,
};

const KIND_LABEL = { safety: "Safety", bot: "Random check", claim: "About their application" } as const;

const day = (iso?: string) => (iso ? format(new Date(`${iso}T12:00:00`), "MMM d, yyyy") : "—");
const yesNo = (b: boolean) => (b ? "Yes" : "No");

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-medium text-sm">{children}</h3>;
}

export function Responses({ item, passcode }: { item: ApplicantItem; passcode: string }) {
  const data = useQuery(api.recruiter.responses, { passcode, applicantId: item.id });
  const translateAnswers = useAction(api.ai.translateAnswers);
  const [english, setEnglish] = useState<{ question: string; answer: string }[]>();
  const [showEnglish, setShowEnglish] = useState(false);
  const [translating, setTranslating] = useState(false);

  if (!data) return <Skeleton className="h-64 w-full rounded-lg" />;

  const toggleEnglish = async () => {
    if (english) return setShowEnglish((s) => !s);
    setTranslating(true);
    try {
      setEnglish(await translateAnswers({ passcode, applicantId: item.id }));
      setShowEnglish(true);
    } catch (error) {
      toast.error(error instanceof ConvexError ? String(error.data) : "Could not translate right now");
    } finally {
      setTranslating(false);
    }
  };

  const { form } = data;
  const facts: [string, string][] = form
    ? [
        ["Years in trade", String(form.yearsInTrade)],
        ["Last employer", form.lastEmployer],
        ["Last site", form.lastSite],
        ["Safety card", form.hasCard ? `Yes${form.provider ? `, ${form.provider}` : ""}` : "No"],
        ["Card ID", form.cardId || "—"],
        ["Card issued", day(form.cardIssueDate)],
        ["Can start", day(form.startDate)],
        ["Own transport", yesNo(form.hasTransport)],
      ]
    : [];
  let claimIndex = 0;

  return (
    <>
      {form && (
        <section className="flex flex-col gap-3">
          <Heading>Application</Heading>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-4 sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="break-words font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Heading>Check answers</Heading>
          <div className="flex items-center gap-2">
            {item.language === "es" && (
              <Button variant="outline" size="sm" onClick={toggleEnglish} disabled={translating}>
                {translating ? <Spinner /> : <Languages aria-hidden="true" />}
                {showEnglish ? "Show Spanish" : "Translate to English"}
              </Button>
            )}
            {item.consistency && item.consistency.source !== "none" && (
              <Badge variant="outline" className={cn("rounded-md capitalize", RESULT_STYLE[item.consistency.result])}>
                {item.consistency.result}
                {item.consistency.source === "fallback" && " · keyword fallback"}
              </Badge>
            )}
          </div>
        </div>
        {item.consistency?.reason && <p className="text-muted-foreground leading-relaxed">{item.consistency.reason}</p>}
        <ol className="flex flex-col gap-3">
          {data.answers.map((q, i) => {
            const t = q.kind === "claim" && showEnglish ? english?.[claimIndex] : undefined;
            if (q.kind === "claim") claimIndex++;
            const graded = q.correct !== undefined;
            return (
              <li key={q.id} className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                    {i + 1}. {KIND_LABEL[q.kind]}
                  </p>
                  <div className="flex gap-1.5">
                    {q.pasted && <Badge variant="outline">Pasted</Badge>}
                    {q.expired && <Badge variant="outline">Out of time</Badge>}
                    {graded && (
                      <Badge
                        variant="outline"
                        className={cn("rounded-md", verdictConfig[q.correct ? "green" : "amber"].className)}
                      >
                        {q.correct ? "Correct" : "Wrong"}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="leading-relaxed">{t?.question ?? q.text}</p>
                <blockquote className="whitespace-pre-wrap break-words border-l-2 pl-3 font-medium leading-relaxed">
                  {q.answer === undefined ? (
                    <span className="font-normal text-muted-foreground">Not reached yet</span>
                  ) : (
                    (t?.answer ?? q.answer) || <span className="font-normal text-muted-foreground">No answer</span>
                  )}
                </blockquote>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
