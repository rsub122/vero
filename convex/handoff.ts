import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { logEvent } from "./audit";
import { VIEW_LOG_WINDOW_MS } from "./lib/constants";
import { newToken } from "./lib/token";
import { getApplicant, requireRecruiter } from "./recruiter";

/** Idempotent: a second click does nothing (R27). */
export const sendToPm = mutation({
  args: { passcode: v.string(), applicantId: v.id("applicants") },
  handler: async (ctx, { passcode, applicantId }) => {
    requireRecruiter(passcode);
    const a = await getApplicant(ctx, applicantId);
    if (a.recruiterState === "sent") return;
    const ready = a.verdict?.level === "green" || a.recruiterState === "confirmed";
    if (a.status !== "verified" || !ready) throw new ConvexError("Confirm this applicant by phone first");
    await ctx.db.patch(a._id, { recruiterState: "sent", shareToken: newToken(), emailState: "pending" });
    await logEvent(ctx, a, "sent_to_pm", "recruiter");
    await ctx.scheduler.runAfter(0, internal.handoff.deliver, { applicantId });
  },
});

export const retryEmail = mutation({
  args: { passcode: v.string(), applicantId: v.id("applicants") },
  handler: async (ctx, { passcode, applicantId }) => {
    requireRecruiter(passcode);
    const a = await getApplicant(ctx, applicantId);
    if (a.emailState !== "failed") return;
    await ctx.db.patch(a._id, { emailState: "pending" });
    await logEvent(ctx, a, "email_retry", "recruiter");
    await ctx.scheduler.runAfter(0, internal.handoff.sendEmail, { applicantId });
  },
});

export const handoffInputs = internalQuery({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, { applicantId }) => {
    const a = await ctx.db.get(applicantId);
    const job = a && (await ctx.db.get(a.jobId));
    if (!a?.shareToken || !a.verdict || !job) return null;
    return {
      shareToken: a.shareToken,
      jobTitle: job.title,
      foremanName: job.foremanName,
      foremanEmail: job.foremanEmail,
      note: `Vero pre-check: ${a.verdict.level === "green" ? "No call needed" : "Confirmed by recruiter call"}. ${a.verdict.reasons.join(". ")}.`,
    };
  },
});

/** Step 1 posts the ATS note, step 2 emails the foreman. A retry repeats step 2 only. */
export const deliver = internalAction({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, { applicantId }) => {
    const input = await ctx.runQuery(internal.handoff.handoffInputs, { applicantId });
    if (!input) return;
    try {
      await fetch(`${process.env.CONVEX_SITE_URL}/ats/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-ATS-Secret": process.env.ATS_SECRET ?? "" },
        body: JSON.stringify({ applicantId, note: input.note }),
      });
    } catch {
      // A failed ATS post does not block the email; the card simply shows no note.
    }
    await emailForeman(ctx, applicantId);
  },
});

export const sendEmail = internalAction({
  args: { applicantId: v.id("applicants") },
  handler: async (ctx, { applicantId }) => emailForeman(ctx, applicantId),
});

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

// Plain fetch to Resend so the send result is known now (R29). Email HTML holds only constants,
// the job title and the link: no applicant-typed or model-written text.
async function emailForeman(ctx: ActionCtx, applicantId: Id<"applicants">) {
  const input = await ctx.runQuery(internal.handoff.handoffInputs, { applicantId });
  if (!input) return;
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/c/${input.shareToken}`;
  const title = escapeHtml(input.jobTitle);
  let status = 0;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM ?? "Vero <onboarding@resend.dev>",
        to: [input.foremanEmail],
        subject: `Vero: a pre-checked candidate for ${input.jobTitle}`,
        html: `<p>Hi ${escapeHtml(input.foremanName)},</p><p>A recruiter sent you a pre-checked candidate for <strong>${title}</strong>.</p><p><a href="${link}">Open the candidate summary</a></p><p>Vero</p>`,
        text: `A recruiter sent you a pre-checked candidate for ${input.jobTitle}.\n\nOpen the candidate summary: ${link}`,
      }),
    });
    status = response.status;
  } catch {
    status = 0;
  }
  await ctx.runMutation(internal.handoff.markEmail, { applicantId, ok: status >= 200 && status < 300, status });
}

export const markEmail = internalMutation({
  args: { applicantId: v.id("applicants"), ok: v.boolean(), status: v.number() },
  handler: async (ctx, { applicantId, ok, status }) => {
    const a = await ctx.db.get(applicantId);
    if (!a) return;
    await ctx.db.patch(applicantId, { emailState: ok ? "sent" : "failed" });
    await logEvent(ctx, a, ok ? "email_sent" : "email_failed", "system", { httpStatus: status });
  },
});

/** Called by the mock ATS HTTP endpoint after it checks the shared secret. One note per applicant. */
export const recordAtsNote = internalMutation({
  args: { applicantId: v.string(), note: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("applicants", args.applicantId);
    const a = id && (await ctx.db.get(id));
    if (!a || a.recruiterState !== "sent") return false;
    const existing = await ctx.db
      .query("atsNotes")
      .withIndex("by_applicant", (q) => q.eq("applicantId", a._id))
      .first();
    if (existing) return true;
    await ctx.db.insert("atsNotes", { applicantId: a._id, note: args.note.slice(0, 1000), receivedAt: Date.now() });
    await logEvent(ctx, a, "ats_webhook_sent", "system");
    return true;
  },
});

/** The foreman's read-only page: only the R28 fields, never phone or timing. */
export const candidate = query({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    if (shareToken.length < 32) return null;
    const a = await ctx.db
      .query("applicants")
      .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
      .unique();
    const job = a && (await ctx.db.get(a.jobId));
    if (!a?.form || !a.verdict || !job) return null;
    return {
      jobTitle: job.title,
      company: job.company,
      name: a.form.name,
      level: a.verdict.level,
      reasons: a.verdict.reasons,
      notes: a.verdict.level === "green" ? a.verdict.notes : [],
      yearsInTrade: a.form.yearsInTrade,
      lastEmployer: a.form.lastEmployer,
      startDate: a.form.startDate,
      hasTransport: a.form.hasTransport,
      confirmedByCall: a.verdict.level === "amber",
    };
  },
});

export const logCandidateView = mutation({
  args: { shareToken: v.string() },
  handler: async (ctx, { shareToken }) => {
    if (shareToken.length < 32) return;
    const a = await ctx.db
      .query("applicants")
      .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
      .unique();
    const now = Date.now();
    if (!a || (a.lastViewLoggedAt && now - a.lastViewLoggedAt < VIEW_LOG_WINDOW_MS)) return;
    await ctx.db.patch(a._id, { lastViewLoggedAt: now });
    await logEvent(ctx, a, "candidate_page_viewed", "foreman");
  },
});
