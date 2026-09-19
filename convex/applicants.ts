import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { logEvent } from "./audit";
import { isValidPastDay } from "./lib/checks";
import { ABANDON_MS, MAX_SHORT_TEXT } from "./lib/constants";
import { templateClaimQuestions } from "./lib/questions";
import { newToken } from "./lib/token";
import { RANK } from "./lib/verdict";
import { clientTiming, formFields, language } from "./schema";

// Public queries return hand-built projections, never whole documents (KTD3).

export const job = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const row = await ctx.db
      .query("jobs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    return row ? { title: row.title, company: row.company } : null;
  },
});

export const providers = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("providers").collect();
    // No status: the list gives no hint which providers are revoked (R3).
    return rows.map((p) => ({ id: p._id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const sessionStatus = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const row = await ctx.db
      .query("applicants")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", token))
      .unique();
    if (!row) return "unknown" as const;
    if (row.status === "started") return "form" as const;
    if (row.status === "submitted" || row.status === "checking") return "check" as const;
    return "done" as const;
  },
});

export const startApplication = mutation({
  args: { slug: v.string(), language },
  handler: async (ctx, args) => {
    const jobRow = await ctx.db
      .query("jobs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!jobRow) throw new ConvexError("Unknown job");
    const sessionToken = newToken();
    const now = Date.now();
    const _id = await ctx.db.insert("applicants", {
      jobId: jobRow._id,
      sessionToken,
      status: "started",
      language: args.language,
      seeded: false,
      startedAt: now,
      questionIndex: 0,
      recruiterState: "new",
    });
    await logEvent(ctx, { _id, jobId: jobRow._id }, "application_started", "applicant", { language: args.language });
    return sessionToken;
  },
});

const short = (text: string) => text.trim().length > 0 && text.length <= MAX_SHORT_TEXT;

export const submitForm = mutation({
  args: { token: v.string(), language, form: formFields, clientTiming },
  handler: async (ctx, args) => {
    const applicant = await ctx.db
      .query("applicants")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.token))
      .unique();
    if (!applicant) throw new ConvexError("Unknown session");
    // Double submit, refresh and back are no-ops (R9).
    if (applicant.status !== "started") return;

    const now = Date.now();
    const f = args.form;
    const valid =
      [f.name, f.lastEmployer, f.lastSite].every(short) &&
      /^[0-9+()\-.\s]{7,20}$/.test(f.phone) &&
      Number.isInteger(f.yearsInTrade) &&
      f.yearsInTrade >= 0 &&
      f.yearsInTrade <= 70 &&
      /^\d{4}-\d{2}-\d{2}$/.test(f.startDate) &&
      Object.keys(args.clientTiming.fields).length <= 20;
    if (!valid) throw new ConvexError("Invalid form");

    let providerName: string | undefined;
    if (f.hasCard) {
      const listed = f.providerId ? await ctx.db.get(f.providerId) : null;
      providerName = listed?.name ?? f.providerOther?.trim();
      const cardValid =
        providerName !== undefined &&
        short(providerName) &&
        f.cardId !== undefined &&
        short(f.cardId) &&
        f.cardIssueDate !== undefined &&
        isValidPastDay(f.cardIssueDate, now);
      if (!cardValid) throw new ConvexError("Invalid card details");
    }
    const form = f.hasCard
      ? { ...f, providerOther: f.providerId ? undefined : f.providerOther?.trim() }
      : { ...f, providerId: undefined, providerOther: undefined, cardId: undefined, cardIssueDate: undefined };

    await ctx.db.patch(applicant._id, {
      status: "submitted",
      language: args.language,
      submittedAt: now,
      form,
      clientTiming: args.clientTiming,
      // Templates first; the model's questions overwrite them only if they arrive in time (KTD7).
      claimQuestions: { source: "template", items: templateClaimQuestions({ ...f, providerName }, args.language) },
      rank: RANK.inProgress,
    });
    await logEvent(ctx, applicant, "form_submitted", "applicant", {
      serverSeconds: Math.round((now - applicant.startedAt) / 1000),
      clientSeconds: Math.round(args.clientTiming.totalMs / 1000),
    });
    await ctx.scheduler.runAfter(0, internal.ai.generateClaimQuestions, { applicantId: applicant._id });
    await ctx.scheduler.runAfter(ABANDON_MS, internal.verify.abandonCheck, { applicantId: applicant._id });
  },
});
