"use client";

import type { ReactNode } from "react";

import { DragDropProvider, type DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/react";
import { cn } from "cn";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantAction } from "./applicant-action";
import { applicantMeta, VerdictBadge } from "./applicant-sheet";
import { useRecruiterActions } from "./use-recruiter-actions";
import { type ApplicantItem, boardMove, type LaneId, laneOf, lanes } from "./verdict-config";

type OnOpen = (id: Id<"applicants">) => void;

const failed = (fallback: string) => (error: unknown) =>
  toast.error(error instanceof ConvexError ? String(error.data) : fallback);

function LaneCard({ item, passcode, onOpen }: { item: ApplicantItem; passcode: string; onOpen: OnOpen }) {
  const lane = laneOf(item);
  // The whole card is the drag source. dnd-kit waits for 5px of movement, so a plain click still opens the sheet.
  const { ref, isDragging } = useDraggable({ id: item.id, type: "applicant" });

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: the name button is the keyboard path; this only widens the mouse target.
    // biome-ignore lint/a11y/noStaticElementInteractions: same as above.
    <article
      ref={ref}
      onClick={() => onOpen(item.id)}
      className={cn(
        "flex cursor-grab touch-none select-none flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground shadow-xs transition-colors hover:border-foreground/20 hover:bg-accent/40 active:cursor-grabbing",
        isDragging && "opacity-60 shadow-lg",
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpen(item.id);
        }}
        className="min-w-0 cursor-pointer self-start truncate text-left font-medium text-sm hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {item.name}
      </button>
      <p className="-mt-1.5 truncate text-muted-foreground text-xs">{applicantMeta(item)}</p>
      <p className="line-clamp-2 text-sm">{item.verdict?.reasons[0] ?? item.step}</p>
      <div className="flex items-center justify-between gap-2">
        <VerdictBadge level={item.verdict?.level} bot={laneOf(item) === "bots"} />
        {lane !== "checking" && (
          // biome-ignore lint/a11y/useKeyWithClickEvents: stops the card's mouse click; the button inside has its own keys.
          // biome-ignore lint/a11y/noStaticElementInteractions: same as above.
          <div className="shrink-0 cursor-default" onClick={(e) => e.stopPropagation()}>
            <ApplicantAction item={item} passcode={passcode} />
          </div>
        )}
      </div>
    </article>
  );
}

function Lane({ lane, count, children }: { lane: (typeof lanes)[number]; count: number; children: ReactNode }) {
  const { ref, isDropTarget } = useDroppable({ id: lane.id, accept: "applicant" });
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
      <div className="flex max-h-[36rem] min-h-24 flex-col gap-3 overflow-y-auto px-3 pb-3 [scrollbar-width:thin]">
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
  const { sendToPm, setOutcome, reopen } = useRecruiterActions();

  const onDragEnd = (event: DragEndEvent) => {
    const { source, target } = event.operation;
    if (event.canceled || !source || !target) return;
    const item = items.find((i) => i.id === source.id);
    if (!item) return;
    const move = boardMove(item, target.id as LaneId);
    const applicantId = item.id;
    const done = (message: string) => () => toast.success(`${item.name} ${message}`);

    switch (move.kind) {
      case "none":
        return;
      case "refuse":
        toast.info(move.reason);
        return;
      case "send":
        sendToPm({ passcode, applicantId }).then(done("sent to the PM")).catch(failed("Could not send to the PM"));
        return;
      case "reopen":
        reopen({ passcode, applicantId }).then(done("moved back to Needs a call")).catch(failed("Could not reopen"));
        return;
      case "confirm":
        setOutcome({ passcode, applicantId, outcome: "confirmed" })
          .then(done("marked confirmed"))
          .catch(failed("Could not save the outcome"));
        return;
      case "not_proceeding":
        setOutcome({ passcode, applicantId, outcome: "not_proceeding" })
          .then(done("marked not proceeding"))
          .catch(failed("Could not save the outcome"));
    }
  };

  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      <div className="overflow-x-auto px-4 pb-1 [scrollbar-width:thin]">
        <div className="grid items-start gap-4 md:grid-cols-[repeat(5,minmax(18rem,1fr))]">
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
