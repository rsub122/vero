"use client";

import { useState } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantAction } from "./applicant-action";
import { applicantMeta, VerdictBadge } from "./applicant-sheet";
import { type ApplicantItem, laneOf, lanes } from "./verdict-config";

const laneTitle = Object.fromEntries(lanes.map((l) => [l.id, l.title]));
const PAGE_SIZE = 12;

interface ApplicantsTableProps {
  items: ApplicantItem[];
  passcode: string;
  onOpen: (id: Id<"applicants">) => void;
}

export function ApplicantsTable({ items, passcode, onOpen }: ApplicantsTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  // Clamped rather than reset so a filter change or a realtime insert never strands you on an empty page.
  const current = Math.min(page, pageCount - 1);
  const rows = items.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <Table className="**:data-[slot='table-cell']:px-4 **:data-[slot='table-head']:px-4">
        <TableHeader className="[&_tr]:border-t">
          <TableRow>
            <TableHead className="py-3 font-normal">Applicant</TableHead>
            <TableHead className="hidden py-3 font-normal sm:table-cell">Verdict</TableHead>
            <TableHead className="hidden py-3 font-normal lg:table-cell">Top reason</TableHead>
            <TableHead className="hidden py-3 font-normal md:table-cell">Stage</TableHead>
            <TableHead className="py-3 text-right font-normal">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No applicants match.
              </TableCell>
            </TableRow>
          )}
          {rows.map((item) => (
            <TableRow key={item.id} className="relative border-border/60">
              <TableCell className="max-w-56 py-3">
                {/* Stretched button: the whole row opens the sheet, the action cell sits above it. */}
                <button
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="block max-w-full truncate text-left font-medium after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-md focus-visible:after:ring-2 focus-visible:after:ring-ring"
                >
                  {item.name}
                </button>
                <p className="truncate text-muted-foreground text-xs">{applicantMeta(item)}</p>
                <div className="mt-1.5 sm:hidden">
                  <VerdictBadge level={item.verdict?.level} />
                </div>
              </TableCell>
              <TableCell className="hidden py-3 sm:table-cell">
                <VerdictBadge level={item.verdict?.level} />
              </TableCell>
              <TableCell className="hidden max-w-80 py-3 lg:table-cell">
                <p className="truncate text-sm">{item.verdict?.reasons[0] ?? item.step}</p>
                {(item.verdict?.reasons.length ?? 0) > 1 && (
                  <p className="text-muted-foreground text-xs">+{(item.verdict?.reasons.length ?? 1) - 1} more</p>
                )}
              </TableCell>
              <TableCell className="hidden py-3 text-muted-foreground text-sm md:table-cell">
                {laneTitle[laneOf(item)]}
              </TableCell>
              <TableCell className="relative z-10 py-3 text-right">
                <ApplicantAction item={item} passcode={passcode} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator />
      <div className="flex items-center justify-between gap-3 px-4">
        <p className="text-muted-foreground text-sm tabular-nums">
          {items.length === 0
            ? "0 applicants"
            : `${current * PAGE_SIZE + 1}–${current * PAGE_SIZE + rows.length} of ${items.length}`}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm tabular-nums">
            Page {current + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={current >= pageCount - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
