import type { Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { type EventType, logEvent } from "./audit";
import { behaviorFlags, cardCheck, normalizeProvider } from "./lib/checks";
import { CLAIM_IDS, SAFETY_QUESTIONS, templateClaimQuestions } from "./lib/questions";
import { newToken } from "./lib/token";
import { computeVerdict } from "./lib/verdict";

const DAY = 24 * 60 * 60 * 1000;
const PROVIDERS: [string, "clear" | "revoked"][] = [
  ["Apex Safety Training", "clear"],
  ["BuildSafe Academy", "clear"],
  ["Empire State Safety Institute", "clear"],
  ["Five Boroughs Safety School", "clear"],
  ["Hudson Valley Safety Council", "clear"],
  ["Metro Construction Training Center", "clear"],
  ["Northeast Laborers Training Fund", "clear"],
  ["Skyline OSHA Training", "clear"],
  ["Tri-State Site Safety", "clear"],
  ["Liberty Site Safety Group", "revoked"],
  ["QuickCard Safety LLC", "revoked"],
  ["Valor Training Solutions", "revoked"],
];

async function deleteApplicant(ctx: MutationCtx, applicantId: Id<"applicants">) {
  for (const table of ["answers", "auditEvents", "atsNotes"] as const) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_applicant", (q) => q.eq("applicantId", applicantId))
      .collect();
    for (const row of rows) await ctx.db.delete(row._id);
  }
  await ctx.db.delete(applicantId);
}

/** Deletes every applicant that is not seeded. Run before and after the demo. */
export const purge = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("applicants")
      .withIndex("by_seeded", (q) => q.eq("seeded", false))
      .collect();
    for (const row of rows) await deleteApplicant(ctx, row._id);
    return rows.length;
  },
});

interface SeedApplicant {
  name: string;
  phone: string;
  yearsInTrade: number;
  lastEmployer: string;
  lastSite: string;
  provider: string;
  cardIssuedDaysAgo: number;
  formSeconds: number;
  safety: boolean[];
  botAnswer: string;
  claimAnswers: [string, string];
  consistency: "match" | "partial";
  minutesAgo: number;
}

const APPLICANTS: SeedApplicant[] = [
  {
    name: "Dario Velez",
    phone: "(718) 555-0142",
    yearsInTrade: 6,
    lastEmployer: "Corbel Builders",
    lastSite: "Atlantic Yards tower B",
    provider: "QuickCard Safety LLC",
    cardIssuedDaysAgo: 400,
    formSeconds: 96,
    safety: [false, false, false],
    botAnswer: "4",
    claimAnswers: ["general labor", "online, one day"],
    consistency: "partial",
    minutesAgo: 95,
  },
  {
    name: "Jordan Smith",
    phone: "(646) 555-0187",
    yearsInTrade: 10,
    lastEmployer: "ABC Construction",
    lastSite: "Main St",
    provider: "Apex Safety Training",
    cardIssuedDaysAgo: 300,
    formSeconds: 8,
    safety: [true, false, true],
    botAnswer: "As an applicant, I am excited to answer.",
    claimAnswers: ["I performed various construction duties.", "I completed the required training."],
    consistency: "partial",
    minutesAgo: 70,
  },
  {
    name: "Marcus Boateng",
    phone: "(347) 555-0119",
    yearsInTrade: 14,
    lastEmployer: "Turner Construction",
    lastSite: "Mercy Hospital expansion",
    provider: "Empire State Safety Institute",
    // Five years plus about four months: the card expired four months before the seed run.
    cardIssuedDaysAgo: 5 * 365 + 123,
    formSeconds: 104,
    safety: [true, true, true],
    botAnswer: "four",
    claimAnswers: ["Framing and drywall on the Mercy Hospital job", "Empire State, 30 hours over a week in Queens"],
    consistency: "match",
    minutesAgo: 45,
  },
  {
    name: "Elena Marquez",
    phone: "(917) 555-0164",
    yearsInTrade: 9,
    lastEmployer: "Skanska",
    lastSite: "LaGuardia Terminal B",
    provider: "BuildSafe Academy",
    cardIssuedDaysAgo: 2 * 365,
    formSeconds: 88,
    safety: [true, true, true],
    botAnswer: "4",
    claimAnswers: ["Concrete formwork at LaGuardia terminal B", "BuildSafe in the Bronx, four days"],
    consistency: "match",
    minutesAgo: 20,
  },
];

/** Idempotent demo data (R34). Verdicts come straight from computeVerdict, never from the model. */
export const run = internalMutation({
  args: {},
  handler: async (ctx) => {
    const old = await ctx.db
      .query("applicants")
      .withIndex("by_seeded", (q) => q.eq("seeded", true))
      .collect();
    for (const row of old) await deleteApplicant(ctx, row._id);

    const slug = "site-laborer";
    const existingJob = await ctx.db
      .query("jobs")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existingJob && process.env.FOREMAN_EMAIL) {
      await ctx.db.patch(existingJob._id, { foremanEmail: process.env.FOREMAN_EMAIL });
    }
    const jobId =
      existingJob?._id ??
      (await ctx.db.insert("jobs", {
        title: "Site Laborer, Hudson Yards Phase 3",
        slug,
        company: "Northline Builders",
        foremanName: "Sam Ortiz",
        foremanEmail: process.env.FOREMAN_EMAIL ?? "foreman@example.com",
        aiWindowStart: 0,
        aiCallCount: 0,
      }));

    const providerIds = new Map<string, Id<"providers">>();
    for (const [name, status] of PROVIDERS) {
      const normalizedName = normalizeProvider(name);
      const existing = await ctx.db
        .query("providers")
        .withIndex("by_normalized", (q) => q.eq("normalizedName", normalizedName))
        .first();
      providerIds.set(name, existing?._id ?? (await ctx.db.insert("providers", { name, normalizedName, status })));
    }

    const now = Date.now();
    for (const s of APPLICANTS) {
      const startedAt = now - s.minutesAgo * 60_000;
      const submittedAt = startedAt + s.formSeconds * 1000;
      const providerId = providerIds.get(s.provider);
      const status = PROVIDERS.find(([name]) => name === s.provider)?.[1] ?? "clear";
      const form = {
        name: s.name,
        phone: s.phone,
        yearsInTrade: s.yearsInTrade,
        lastEmployer: s.lastEmployer,
        lastSite: s.lastSite,
        hasCard: true,
        providerId,
        cardId: `SST-${s.phone.slice(-4)}${s.yearsInTrade}`,
        cardIssueDate: new Date(now - s.cardIssuedDaysAgo * DAY).toISOString().slice(0, 10),
        startDate: new Date(now + 7 * DAY).toISOString().slice(0, 10),
        hasTransport: true,
      };
      const botTrapPassed = ["4", "four", "cuatro"].includes(s.botAnswer);
      const card = cardCheck(form.cardIssueDate, now);
      const checks = {
        provider: status,
        card: card.status,
        cardExpiresAt: card.expiresAt,
        consistency: {
          result: s.consistency,
          reason:
            s.consistency === "match"
              ? "The answers name the same employer, site and course as the application."
              : "The answers are generic and do not mention the employer, site or course.",
          source: "seed" as const,
        },
        safetyScore: s.safety.filter(Boolean).length,
        flags: behaviorFlags({ startedAt, submittedAt, botTrapPassed, claimAnswerPasted: false, completed: true }),
        formSeconds: s.formSeconds,
      };
      const { rank, ...verdict } = computeVerdict({ ...checks, consistency: s.consistency });
      const applicant = {
        _id: await ctx.db.insert("applicants", {
          jobId,
          sessionToken: newToken(),
          status: "verified",
          language: "en",
          seeded: true,
          startedAt,
          submittedAt,
          form,
          clientTiming: { totalMs: s.formSeconds * 1000, fields: {} },
          claimQuestions: {
            source: "template",
            items: templateClaimQuestions({ ...form, providerName: s.provider }, "en"),
          },
          questionIndex: 6,
          checks,
          verdict,
          rank,
          recruiterState: "new",
        }),
        jobId,
      };

      let at = submittedAt + 5000;
      const chain: [EventType, number][] = [
        ["application_started", startedAt],
        ["form_submitted", submittedAt],
        ["check_started", at],
      ];
      const answers = [
        ...s.safety.map((ok, i) => ({
          questionId: SAFETY_QUESTIONS[i].id,
          kind: "safety" as const,
          value: String(ok ? SAFETY_QUESTIONS[i].correct : 0),
          correct: ok,
        })),
        { questionId: "bot", kind: "bot" as const, value: s.botAnswer, correct: botTrapPassed },
        ...s.claimAnswers.map((value, i) => ({ questionId: CLAIM_IDS[i], kind: "claim" as const, value })),
      ];
      for (const answer of answers) {
        at += 9000;
        await ctx.db.insert("answers", {
          applicantId: applicant._id,
          ...answer,
          answeredAt: at,
          expired: false,
          pasted: false,
        });
        chain.push(["question_answered", at]);
      }
      chain.push(["check_completed", at], ["verification_run", at + 1500], ["verdict_issued", at + 1500]);
      for (const [type, when] of chain) await logEvent(ctx, applicant, type, "seed", undefined, when);
    }
    return { jobSlug: slug, providers: PROVIDERS.length, applicants: APPLICANTS.length };
  },
});
