"use client";

import type { OptimisticLocalStore } from "convex/browser";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { countApplicants } from "@/convex/lib/verdict";

import type { ApplicantItem } from "./verdict-config";

/** Patches the cached board so a click shows up at once; Convex rolls it back if the mutation throws. */
function patchApplicant(
  store: OptimisticLocalStore,
  id: Id<"applicants">,
  patch: (item: ApplicantItem) => Partial<ApplicantItem>,
) {
  for (const { args, value } of store.getAllQueries(api.recruiter.list)) {
    if (!value) continue;
    const items = value.items.map((i) => (i.id === id ? { ...i, ...patch(i) } : i));
    const counts = countApplicants(items.map((i) => ({ level: i.verdict?.level, recruiterState: i.recruiterState })));
    store.setQuery(api.recruiter.list, args, { items, counts });
  }
}

export function useRecruiterActions() {
  const sendToPm = useMutation(api.handoff.sendToPm).withOptimisticUpdate((store, { applicantId }) =>
    patchApplicant(store, applicantId, () => ({ recruiterState: "sent", emailState: "pending" })),
  );
  const setOutcome = useMutation(api.recruiter.setOutcome).withOptimisticUpdate((store, { applicantId, outcome }) =>
    patchApplicant(store, applicantId, () => ({ recruiterState: outcome })),
  );
  const logCall = useMutation(api.recruiter.logCall).withOptimisticUpdate((store, { applicantId }) =>
    patchApplicant(store, applicantId, (i) => (i.recruiterState === "new" ? { recruiterState: "called" } : {})),
  );
  return { sendToPm, setOutcome, logCall };
}
