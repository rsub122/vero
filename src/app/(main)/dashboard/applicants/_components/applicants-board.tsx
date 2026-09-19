"use client";

import { useState } from "react";

import { useConvexConnectionState, useQuery } from "convex/react";
import { Users, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantCard } from "./applicant-card";
import { CounterLine } from "./counter-line";
import { JobLink } from "./job-link";
import { PasscodeGate } from "./passcode-gate";

function Board({ passcode }: { passcode: string }) {
  const jobs = useQuery(api.recruiter.jobs, { passcode });
  const [picked, setPicked] = useState<Id<"jobs"> | null>(null);
  const job = jobs?.find((j) => j.id === picked) ?? jobs?.[0];
  const data = useQuery(api.recruiter.list, job ? { passcode, jobId: job.id } : "skip");
  const online = useConvexConnectionState().isWebSocketConnected;

  if (jobs === undefined) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (!job) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No jobs yet</EmptyTitle>
          <EmptyDescription>Run the seed to create the demo job.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-muted-foreground text-sm">{job.company}</p>
          {jobs.length > 1 ? (
            <NativeSelect
              aria-label="Job"
              value={job.id}
              onChange={(e) => setPicked(e.target.value as Id<"jobs">)}
              className="text-xl"
            >
              {jobs.map((j) => (
                <NativeSelectOption key={j.id} value={j.id}>
                  {j.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <h1 className="text-3xl tracking-tight">{job.title}</h1>
          )}
        </div>
        <JobLink slug={job.slug} title={job.title} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {data ? <CounterLine counts={data.counts} /> : <Skeleton className="h-7 w-80" />}
        {!online && (
          <Badge variant="outline" className="gap-1">
            <WifiOff aria-hidden="true" />
            Reconnecting…
          </Badge>
        )}
      </div>

      {data === undefined && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      )}
      {data?.items.length === 0 && (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No applicants yet</EmptyTitle>
            <EmptyDescription>Share the apply link or QR code. New applicants appear here live.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
      {data && data.items.length > 0 && (
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((item) => (
            <ApplicantCard key={item.id} item={item} passcode={passcode} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ApplicantsBoard() {
  return <PasscodeGate>{(passcode) => <Board passcode={passcode} />}</PasscodeGate>;
}
