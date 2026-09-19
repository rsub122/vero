import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, type QueryCtx, query } from "./_generated/server";
import { EVENT_LABELS, type EventType, logEvent } from "./audit";
import { countApplicants } from "./lib/verdict";

/**
 * Every recruiter function calls this first (KTD10). The Convex URL ships in the client bundle,
 * so this check, not the Next.js route, is what protects applicant data. Fails closed when unset.
 */
export function requireRecruiter(passcode: string) {
  const expected = process.env.RECRUITER_PASSCODE;
  if (!expected || passcode !== expected) throw new ConvexError("Not authorized");
}

export async function getApplicant(ctx: QueryCtx, id: Doc<"applicants">["_id"]) {
  const a = await ctx.db.get(id);
  if (!a) throw new ConvexError("Applicant not found");
  return a;
}

const STEP: Record<Doc<"applicants">["status"], string> = {
  started: "Opened the form",
  submitted: "Form sent, check not started",
  checking: "Taking the timed check",
  completed: "Verifying",
  abandoned: "Verifying",
  verified: "Verified",
};

export const checkPasscode = mutation({
  args: { passcode: v.string() },
  handler: async (_ctx, { passcode }) => {
    try {
      requireRecruiter(passcode);
      return true;
    } catch {
      return false;
    }
  },
});

export const jobs = query({
  args: { passcode: v.string() },
  handler: async (ctx, { passcode }) => {
    requireRecruiter(passcode);
    const rows = await ctx.db.query("jobs").collect();
    return rows.map((j) => ({ id: j._id, title: j.title, slug: j.slug, company: j.company }));
  },
});

/** Amber first via the rank index. No session token, share token or phone in this projection (R25). */
export const list = query({
  args: { passcode: v.string(), jobId: v.id("jobs") },
  handler: async (ctx, { passcode, jobId }) => {
    requireRecruiter(passcode);
    const rows = await ctx.db
      .query("applicants")
      .withIndex("by_job_rank", (q) => q.eq("jobId", jobId).gte("rank", 0))
      .collect();
    const items = await Promise.all(
      rows.map(async (a) => {
        const answers = await ctx.db
          .query("answers")
          .withIndex("by_applicant", (q) => q.eq("applicantId", a._id))
          .collect();
        const ats = await ctx.db
          .query("atsNotes")
          .withIndex("by_applicant", (q) => q.eq("applicantId", a._id))
          .first();
        return {
          id: a._id,
          name: a.form?.name ?? "",
          step: STEP[a.status],
          submittedAt: a.submittedAt ?? a._creationTime,
          yearsInTrade: a.form?.yearsInTrade,
          lastEmployer: a.form?.lastEmployer,
          lastSite: a.form?.lastSite,
          language: a.language,
          verdict: a.verdict,
          recruiterState: a.recruiterState,
          emailState: a.emailState,
          consistency: a.checks?.consistency,
          claims: (a.claimQuestions?.items ?? []).map((question, i) => ({
            question,
            answer: answers.find((x) => x.questionId === `claim-${i + 1}`)?.value ?? "",
          })),
          atsNote: ats ? { note: ats.note, receivedAt: ats.receivedAt } : undefined,
          webFindings: a.webFindings,
        };
      }),
    );
    return {
      items,
      counts: countApplicants(items.map((i) => ({ level: i.verdict?.level, recruiterState: i.recruiterState }))),
    };
  },
});

/** The only way to the phone number, so every reveal is logged (R25). */
export const logCall = mutation({
  args: { passcode: v.string(), applicantId: v.id("applicants") },
  handler: async (ctx, { passcode, applicantId }) => {
    requireRecruiter(passcode);
    const a = await getApplicant(ctx, applicantId);
    if (a.recruiterState === "new") {
      await ctx.db.patch(a._id, { recruiterState: "called" });
      await logEvent(ctx, a, "call_initiated", "recruiter");
    }
    return a.form?.phone ?? "";
  },
});

export const setOutcome = mutation({
  args: {
    passcode: v.string(),
    applicantId: v.id("applicants"),
    outcome: v.union(v.literal("confirmed"), v.literal("not_proceeding")),
  },
  handler: async (ctx, { passcode, applicantId, outcome }) => {
    requireRecruiter(passcode);
    const a = await getApplicant(ctx, applicantId);
    if (a.recruiterState === "sent" || a.recruiterState === outcome) return;
    await ctx.db.patch(a._id, { recruiterState: outcome });
    await logEvent(ctx, a, "call_outcome", "recruiter", { outcome });
  },
});

export const auditLog = query({
  args: { passcode: v.string(), applicantId: v.id("applicants") },
  handler: async (ctx, { passcode, applicantId }) => {
    requireRecruiter(passcode);
    const events = await ctx.db
      .query("auditEvents")
      .withIndex("by_applicant", (q) => q.eq("applicantId", applicantId))
      .collect();
    return events.map((e) => ({
      id: e._id,
      at: e.at,
      actor: e.actor,
      type: e.type,
      label: EVENT_LABELS[e.type as EventType] ?? e.type,
      data: e.data,
    }));
  },
});

export const logExport = mutation({
  args: { passcode: v.string(), applicantId: v.id("applicants") },
  handler: async (ctx, { passcode, applicantId }) => {
    requireRecruiter(passcode);
    await logEvent(ctx, await getApplicant(ctx, applicantId), "audit_exported", "recruiter");
  },
});
