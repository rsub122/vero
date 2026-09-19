import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import { logEvent } from "./audit";
import { behaviorFlags, cardCheck, normalizeProvider, type ProviderStatus, safetyScore } from "./lib/checks";
import { ABANDON_MS, ABANDON_RECENT_MS, AI_CALLS_PER_JOB_PER_HOUR, AI_WINDOW_MS } from "./lib/constants";
import { FIRST_CLAIM_INDEX } from "./lib/questions";
import { computeVerdict } from "./lib/verdict";
import { consistencyResult } from "./schema";

type ConsistencyResult = NonNullable<Doc<"applicants">["checks"]>["consistency"];

async function providerStatus(ctx: MutationCtx, form: NonNullable<Doc<"applicants">["form"]>): Promise<ProviderStatus> {
  if (!form.hasCard) return "no_card";
  if (form.providerId) return (await ctx.db.get(form.providerId))?.status ?? "unknown";
  // A typed name that matches a listed provider resolves like the listed one.
  const typed = await ctx.db
    .query("providers")
    .withIndex("by_normalized", (q) => q.eq("normalizedName", normalizeProvider(form.providerOther ?? "")))
    .first();
  return typed?.status ?? "unknown";
}

/** Runs the deterministic checks, stores the verdict, and marks the applicant verified. */
async function storeVerdict(ctx: MutationCtx, a: Doc<"applicants">, consistency: ConsistencyResult) {
  if (!a.form || a.submittedAt === undefined) return;
  const now = Date.now();
  const answers = await ctx.db
    .query("answers")
    .withIndex("by_applicant", (q) => q.eq("applicantId", a._id))
    .collect();
  const card = cardCheck(a.form.cardIssueDate, now);
  const checks = {
    provider: await providerStatus(ctx, a.form),
    card: card.status,
    cardExpiresAt: card.expiresAt,
    consistency,
    safetyScore: safetyScore(answers),
    flags: behaviorFlags({
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      botTrapPassed: answers.some((x) => x.kind === "bot" && x.correct === true),
      claimAnswerPasted: answers.some((x) => x.kind === "claim" && x.pasted),
      completed: a.status === "completed",
    }),
    formSeconds: (a.submittedAt - a.startedAt) / 1000,
  };
  const { rank, ...verdict } = computeVerdict({ ...checks, consistency: consistency.result });
  await ctx.db.patch(a._id, { status: "verified", checks, verdict, rank });
  await logEvent(ctx, a, "verification_run", "system", {
    provider: checks.provider,
    card: checks.card,
    consistency: consistency.result,
    consistencySource: consistency.source,
    safetyScore: checks.safetyScore,
    flags: checks.flags.join(" ") || "none",
  });
  await logEvent(ctx, a, "verdict_issued", "system", { level: verdict.level, reasons: verdict.reasons.join("; ") });
  if (a.form.hasCard && !a.form.providerId && checks.provider === "unknown") {
    await ctx.scheduler.runAfter(0, internal.enrichment.lookupProvider, { applicantId: a._id });
  }
}

export const saveVerdict = internalMutation({
  args: { applicantId: v.id("applicants"), consistency: consistencyResult },
  handler: async (ctx, args) => {
    const a = await ctx.db.get(args.applicantId);
    if (a?.status === "completed") await storeVerdict(ctx, a, args.consistency);
  },
});

export const abandonCheck = internalMutation({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, { applicantId }) => {
    const a = await ctx.db.get(applicantId);
    if (!a || (a.status !== "submitted" && a.status !== "checking")) return;
    // A late starter is not cut off mid-check.
    if (a.questionShownAt !== undefined && Date.now() - a.questionShownAt < ABANDON_RECENT_MS) {
      await ctx.scheduler.runAfter(ABANDON_RECENT_MS, internal.verify.abandonCheck, { applicantId });
      return;
    }
    await ctx.db.patch(a._id, { status: "abandoned" });
    await logEvent(ctx, a, "check_abandoned", "system", { afterMinutes: ABANDON_MS / 60000 });
    await storeVerdict(ctx, { ...a, status: "abandoned" }, { result: "skipped", source: "none" });
  },
});

/** What the AI actions need. Internal only. */
export const aiInputs = internalQuery({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, { applicantId }) => {
    const a = await ctx.db.get(applicantId);
    if (!a?.form) return null;
    const provider = a.form.providerId ? await ctx.db.get(a.form.providerId) : null;
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_applicant", (q) => q.eq("applicantId", applicantId))
      .collect();
    return {
      jobId: a.jobId,
      language: a.language,
      form: { ...a.form, providerName: provider?.name ?? a.form.providerOther },
      claimQuestions: a.claimQuestions?.items ?? [],
      claimAnswers: answers.filter((x) => x.kind === "claim").map((x) => x.value),
    };
  },
});

/** The model's questions land only if the first claim question has not been shown (KTD7). */
export const setClaimQuestions = internalMutation({
  args: { applicantId: v.id("applicants"), items: v.array(v.string()) },
  handler: async (ctx, { applicantId, items }) => {
    const a = await ctx.db.get(applicantId);
    const open = a && (a.status === "submitted" || (a.status === "checking" && a.questionIndex < FIRST_CLAIM_INDEX));
    if (!a || !open) return;
    await ctx.db.patch(applicantId, { claimQuestions: { source: "model", items } });
    await logEvent(ctx, a, "claim_questions_generated", "system", { source: "model" });
  },
});

/** Per-job hourly cap on paid calls. A mutation, so concurrent actions cannot race past it (KTD17). */
export const reserveAiCall = internalMutation({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get(jobId);
    if (!job) return false;
    const now = Date.now();
    const fresh = now - job.aiWindowStart > AI_WINDOW_MS;
    const count = fresh ? 0 : job.aiCallCount;
    if (count >= AI_CALLS_PER_JOB_PER_HOUR) return false;
    await ctx.db.patch(jobId, { aiWindowStart: fresh ? now : job.aiWindowStart, aiCallCount: count + 1 });
    return true;
  },
});
