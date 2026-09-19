"use client";

import { useState } from "react";

import { useConvexConnectionState, useQuery } from "convex/react";
import { Columns3, Rows3, Search, Users, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { ApplicantLanes } from "./applicant-lanes";
import { ApplicantSheet } from "./applicant-sheet";
import { ApplicantsTable } from "./applicants-table";
import { JobLink } from "./job-link";
import { KpiStrip } from "./kpi-strip";
import { PasscodeGate } from "./passcode-gate";
import { type LaneId, laneOf, lanes } from "./verdict-config";

const LANE_ORDER: Record<LaneId, number> = { call: 0, ready: 1, checking: 2, done: 3, bots: 4 };

function Board({ passcode }: { passcode: string }) {
  const jobs = useQuery(api.recruiter.jobs, { passcode });
  const [picked, setPicked] = useState<Id<"jobs"> | null>(null);
  const job = jobs?.find((j) => j.id === picked) ?? jobs?.[0];
  const data = useQuery(api.recruiter.list, job ? { passcode, jobId: job.id } : "skip");
  const online = useConvexConnectionState().isWebSocketConnected;
  const [view, setView] = useState<"table" | "board">("table");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<LaneId | "all">("all");
  const [openId, setOpenId] = useState<Id<"applicants"> | null>(null);

  if (jobs === undefined) return <Skeleton className="h-96 w-full rounded-xl" />;
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

  const q = search.trim().toLowerCase();
  // Work still to do first (calls, then ready to send), amber before green inside a step, newest first.
  const items = (data?.items ?? [])
    .toSorted(
      (a, b) =>
        LANE_ORDER[laneOf(a)] - LANE_ORDER[laneOf(b)] ||
        Number(a.verdict?.level === "green") - Number(b.verdict?.level === "green") ||
        b.submittedAt - a.submittedAt,
    )
    .filter(
      (i) =>
        (stage === "all" || laneOf(i) === stage) &&
        (!q || `${i.name} ${i.lastEmployer ?? ""}`.toLowerCase().includes(q)),
    );
  // Looked up live so the sheet follows realtime changes (verdict lands, email sends).
  const openItem = data?.items.find((i) => i.id === openId);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0 space-y-1">
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
          <p className="text-muted-foreground text-sm">
            {job.company}. Share the link or QR code on site; applicants appear here live.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!online && (
            <Badge variant="outline" className="gap-1">
              <WifiOff aria-hidden="true" />
              Reconnecting…
            </Badge>
          )}
          <JobLink slug={job.slug} title={job.title} />
        </div>
      </section>

      {data ? (
        <KpiStrip counts={data.counts} items={data.items} />
      ) : (
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="border-b has-data-[slot=card-action]:grid-cols-1 sm:has-data-[slot=card-action]:grid-cols-[1fr_auto]">
          <CardTitle className="text-xl leading-none">Applicants</CardTitle>
          <CardDescription className="leading-snug">
            Amber sorts to the top. Open a row for reasons, answers and the audit log.
          </CardDescription>
          <CardAction className="col-start-1 row-start-auto justify-self-start sm:col-start-2 sm:row-span-2 sm:row-start-1 sm:justify-self-end">
            <Tabs value={view} onValueChange={(v) => setView(v as "table" | "board")}>
              <TabsList>
                <TabsTrigger value="table">
                  <Rows3 aria-hidden="true" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="board">
                  <Columns3 aria-hidden="true" />
                  Board
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 px-0">
          <div className="flex flex-wrap items-center gap-3 px-4">
            <InputGroup className="h-7 w-full sm:w-64">
              <InputGroupAddon align="inline-start">
                <Search className="size-3.5" aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                className="h-7"
                placeholder="Search name or employer..."
                aria-label="Search applicants"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            {view === "table" && (
              <Select value={stage} onValueChange={(v) => setStage(v as LaneId | "all")}>
                <SelectTrigger size="sm">
                  <span className="text-muted-foreground">Stage:</span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start">
                  <SelectGroup>
                    <SelectItem value="all">All</SelectItem>
                    {lanes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.title}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
            {view === "board" && (
              <p className="text-muted-foreground text-xs">Drag a card to move it to the next step.</p>
            )}
          </div>

          {data === undefined && (
            <div className="flex flex-col gap-2 px-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}
          {data?.items.length === 0 && (
            <Empty className="mx-4 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No applicants yet</EmptyTitle>
                <EmptyDescription>Share the apply link or QR code. New applicants appear here live.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {data &&
            data.items.length > 0 &&
            (view === "table" ? (
              <ApplicantsTable items={items} passcode={passcode} onOpen={setOpenId} />
            ) : (
              <ApplicantLanes items={items} passcode={passcode} onOpen={setOpenId} />
            ))}
        </CardContent>
      </Card>

      <ApplicantSheet item={openItem} passcode={passcode} onOpenChange={(open) => !open && setOpenId(null)} />
    </div>
  );
}

export function ApplicantsBoard() {
  return <PasscodeGate>{(passcode) => <Board passcode={passcode} />}</PasscodeGate>;
}
