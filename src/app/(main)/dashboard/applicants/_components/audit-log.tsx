"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { auditCsv } from "./export-audit";

export function AuditLog({
  passcode,
  applicantId,
  name,
}: {
  passcode: string;
  applicantId: Id<"applicants">;
  name: string;
}) {
  const events = useQuery(api.recruiter.auditLog, { passcode, applicantId });
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">Every event with its server time, oldest first.</p>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!events}>
          <Download aria-hidden="true" />
          Export CSV
        </Button>
      </div>
      <ol>
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
    </div>
  );
}
