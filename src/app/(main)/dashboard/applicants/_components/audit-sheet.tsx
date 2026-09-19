"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { auditCsv } from "./export-audit";

interface AuditSheetProps {
  passcode: string;
  applicantId: Id<"applicants">;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditSheet({ passcode, applicantId, name, open, onOpenChange }: AuditSheetProps) {
  const events = useQuery(api.recruiter.auditLog, open ? { passcode, applicantId } : "skip");
  const logExport = useMutation(api.recruiter.logExport);

  const exportCsv = async () => {
    if (!events) return;
    const blob = new Blob([auditCsv(name, events)], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `vero-audit-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    await logExport({ passcode, applicantId }).catch(() => toast.error("Export downloaded but could not be logged"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Audit log</SheetTitle>
          <SheetDescription>{name}. Every event with its server time, oldest first.</SheetDescription>
        </SheetHeader>
        <ol className="flex-1 overflow-y-auto px-4">
          {events === undefined && <Skeleton className="h-40 w-full" />}
          {events?.map((e) => (
            <li
              key={e.id}
              className="relative border-l py-2 pl-4 before:absolute before:top-3.5 before:-left-1 before:size-2 before:rounded-full before:bg-muted-foreground/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-sm">{e.label}</span>
                <time
                  className="shrink-0 text-muted-foreground text-xs tabular-nums"
                  dateTime={new Date(e.at).toISOString()}
                >
                  {format(e.at, "MMM d, HH:mm:ss")}
                </time>
              </div>
              <p className="text-muted-foreground text-xs">
                {e.actor}
                {e.data &&
                  ` · ${Object.entries(e.data)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}`}
              </p>
            </li>
          ))}
        </ol>
        <SheetFooter>
          <Button onClick={exportCsv} disabled={!events}>
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
