"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantAction } from "./applicant-action";
import { applicantMeta, VerdictBadge } from "./applicant-sheet";
import { type ApplicantItem, laneOf, lanes } from "./verdict-config";

const laneTitle = Object.fromEntries(lanes.map((l) => [l.id, l.title]));

interface ApplicantsTableProps {
  items: ApplicantItem[];
  passcode: string;
  onOpen: (id: Id<"applicants">) => void;
}

export function ApplicantsTable({ items, passcode, onOpen }: ApplicantsTableProps) {
  return (
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
        {items.map((item) => (
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
  );
}
