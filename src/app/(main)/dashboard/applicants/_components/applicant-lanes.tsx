"use client";

import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantAction } from "./applicant-action";
import { applicantMeta, VerdictBadge } from "./applicant-sheet";
import { type ApplicantItem, laneOf, lanes } from "./verdict-config";

interface ApplicantLanesProps {
  items: ApplicantItem[];
  passcode: string;
  onOpen: (id: Id<"applicants">) => void;
}

export function ApplicantLanes({ items, passcode, onOpen }: ApplicantLanesProps) {
  return (
    <div className="grid items-start gap-4 px-4 md:grid-cols-2 xl:grid-cols-4">
      {lanes.map((lane) => {
        const inLane = items.filter((i) => laneOf(i) === lane.id);
        return (
          <section
            key={lane.id}
            aria-label={lane.title}
            className="flex min-w-0 flex-col rounded-xl border bg-muted/50"
          >
            <header className="space-y-1 px-4 pt-4 pb-3">
              <h2 className="font-medium text-base leading-none">{lane.title}</h2>
              <p className="text-muted-foreground text-sm tabular-nums leading-none">
                {inLane.length} {inLane.length === 1 ? "applicant" : "applicants"}
              </p>
            </header>
            <div className="flex flex-col gap-3 px-3 pb-3">
              {inLane.length === 0 && (
                <p className="rounded-lg border border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
                  {lane.empty}
                </p>
              )}
              {inLane.map((item) => (
                <article
                  key={item.id}
                  className="relative flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-colors hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(item.id)}
                      className="min-w-0 truncate text-left font-medium text-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
                    >
                      {item.name}
                    </button>
                    <VerdictBadge level={item.verdict?.level} />
                  </div>
                  <p className="line-clamp-2 text-muted-foreground text-xs">{item.verdict?.reasons[0] ?? item.step}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-muted-foreground text-xs">{applicantMeta(item)}</span>
                    <div className="relative z-10 shrink-0">
                      <ApplicantAction item={item} passcode={passcode} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
