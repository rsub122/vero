"use client";

import type { ReactNode } from "react";

import { DragDropProvider, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/react";
import { cn } from "cn";
import { ConvexError } from "convex/values";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantAction } from "./applicant-action";
import { applicantMeta, VerdictBadge } from "./applicant-sheet";
import { useRecruiterActions } from "./use-recruiter-actions";
import { type ApplicantItem, type LaneId, laneOf, lanes } from "./verdict-config";

type OnOpen = (id: Id<"applicants">) => void;

// Only moves the recruiter could make with a button. Verdicts are never dragged: lanes are steps, not grades.
const MOVES: Partial<Record<`${LaneId}>${LaneId}`, "confirmed" | "not_proceeding" | "send">> = {
  "call>ready": "confirmed",
  "call>done": "not_proceeding",
  "ready>done": "send",
};

const failed = (fallback: string) => (error: unknown) =>
  toast.error(error instanceof ConvexError ? String(error.data) : fallback);

function LaneCard({ item, passcode, onOpen }: { item: ApplicantItem; passcode: string; onOpen: OnOpen }) {
  const lane = laneOf(item);
  const movable = lane === "call" || lane === "ready";
  const { ref, handleRef, isDragging } = useDraggable({ id: item.id, type: "applicant", disabled: !movable });

  return (
    <article
      ref={ref}
      className={cn(
        "relative flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-colors hover:bg-accent/40",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <div className="flex min-w-0 items-center gap-1">
        {movable && (
          <Button
            ref={handleRef}
            variant="ghost"
            size="icon-xs"
            className="relative z-10 -ml-1.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label={`Drag ${item.name} to another step`}
          >
            <GripVertical />
          </Button>
        )}
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className="min-w-0 truncate text-left font-medium text-sm after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {item.name}
        </button>
      </div>
      <p className="-mt-1.5 truncate text-muted-foreground text-xs">{applicantMeta(item)}</p>
      <p className="line-clamp-2 text-sm">{item.verdict?.reasons[0] ?? item.step}</p>
      <div className="flex items-center justify-between gap-2">
        <VerdictBadge level={item.verdict?.level} />
        {lane !== "checking" && (
          <div className="relative z-10 shrink-0">
            <ApplicantAction item={item} passcode={passcode} />
          </div>
        )}
      </div>
    </article>
  );
}

function Lane({ lane, count, children }: { lane: (typeof lanes)[number]; count: number; children: ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: lane.id, accept: "applicant", disabled: lane.id === "checking" });
  return (
    <section
      ref={ref}
      aria-label={lane.title}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-muted/50 transition-colors",
        isDropTarget && "border-primary/40 bg-muted",
      )}
    >
      <header className="space-y-1 px-4 pt-4 pb-3">
        <h2 className="font-medium text-base leading-none">{lane.title}</h2>
        <p className="text-muted-foreground text-sm tabular-nums leading-none">
          {count} {count === 1 ? "applicant" : "applicants"}
        </p>
      </header>
      <div className="flex max-h-[36rem] flex-col gap-3 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
        {count === 0 && (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
            {lane.empty}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

export function ApplicantLanes({
  items,
  passcode,
  onOpen,
}: {
  items: ApplicantItem[];
  passcode: string;
  onOpen: OnOpen;
}) {
  const { sendToPm, setOutcome } = useRecruiterActions();

  const onDragEnd = (event: DragEndEvent) => {
    const { source, target } = event.operation;
    if (event.canceled || !source || !target) return;
    const item = items.find((i) => i.id === source.id);
    if (!item) return;
    const from = laneOf(item);
    const to = target.id as LaneId;
    if (from === to) return;
    const move = MOVES[`${from}>${to}`];
    if (!move) {
      toast.info("That step can't be done by dragging.");
      return;
    }
    const applicantId = item.id;
    if (move === "send") {
      sendToPm({ passcode, applicantId })
        .then(() => toast.success(`${item.name} sent to the PM`))
        .catch(failed("Could not send to the PM"));
      return;
    }
    setOutcome({ passcode, applicantId, outcome: move })
      .then(() => toast.success(`${item.name} marked ${move === "confirmed" ? "confirmed" : "not proceeding"}`))
      .catch(failed("Could not save the outcome"));
  };

  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      <div className="overflow-x-auto px-4 pb-1 [scrollbar-width:thin]">
        <div className="grid items-start gap-4 md:grid-cols-[repeat(4,minmax(18rem,1fr))]">
          {lanes.map((lane) => {
            const inLane = items.filter((i) => laneOf(i) === lane.id);
            return (
              <Lane key={lane.id} lane={lane} count={inLane.length}>
                {inLane.map((item) => (
                  <LaneCard key={item.id} item={item} passcode={passcode} onOpen={onOpen} />
                ))}
              </Lane>
            );
          })}
        </div>
      </div>
    </DragDropProvider>
  );
}
