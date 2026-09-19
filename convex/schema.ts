import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const language = v.union(v.literal("en"), v.literal("es"));
export const applicantStatus = v.union(
  v.literal("started"),
  v.literal("submitted"),
  v.literal("checking"),
  v.literal("completed"),
  v.literal("abandoned"),
  v.literal("verified"),
);
export const recruiterState = v.union(
  v.literal("new"),
  v.literal("called"),
  v.literal("confirmed"),
  v.literal("not_proceeding"),
  v.literal("sent"),
);
export const consistencyResult = v.object({
  result: v.union(v.literal("match"), v.literal("partial"), v.literal("conflict"), v.literal("skipped")),
  reason: v.optional(v.string()),
  source: v.union(v.literal("model"), v.literal("fallback"), v.literal("seed"), v.literal("none")),
});
export const formFields = v.object({
  name: v.string(),
  phone: v.string(),
  yearsInTrade: v.number(),
  lastEmployer: v.string(),
  lastSite: v.string(),
  hasCard: v.boolean(),
  providerId: v.optional(v.id("providers")),
  providerOther: v.optional(v.string()),
  cardId: v.optional(v.string()),
  cardIssueDate: v.optional(v.string()),
  startDate: v.string(),
  hasTransport: v.boolean(),
});
export const clientTiming = v.object({
  totalMs: v.number(),
  fields: v.record(v.string(), v.object({ ms: v.number(), pastes: v.number() })),
});

export default defineSchema({
  jobs: defineTable({
    title: v.string(),
    slug: v.string(),
    company: v.string(),
    foremanName: v.string(),
    foremanEmail: v.string(),
    aiWindowStart: v.number(),
    aiCallCount: v.number(),
  }).index("by_slug", ["slug"]),

  providers: defineTable({
    name: v.string(),
    normalizedName: v.string(),
    status: v.union(v.literal("clear"), v.literal("revoked")),
  }).index("by_normalized", ["normalizedName"]),

  applicants: defineTable({
    jobId: v.id("jobs"),
    sessionToken: v.string(),
    status: applicantStatus,
    language,
    seeded: v.boolean(),
    startedAt: v.number(),
    submittedAt: v.optional(v.number()),
    form: v.optional(formFields),
    clientTiming: v.optional(clientTiming),
    claimQuestions: v.optional(
      v.object({ source: v.union(v.literal("template"), v.literal("model")), items: v.array(v.string()) }),
    ),
    questionIndex: v.number(),
    questionShownAt: v.optional(v.number()),
    checks: v.optional(
      v.object({
        provider: v.union(v.literal("clear"), v.literal("revoked"), v.literal("unknown"), v.literal("no_card")),
        card: v.union(v.literal("valid"), v.literal("expiring"), v.literal("expired"), v.literal("none")),
        cardExpiresAt: v.optional(v.number()),
        consistency: consistencyResult,
        safetyScore: v.number(),
        flags: v.array(v.string()),
        formSeconds: v.number(),
      }),
    ),
    verdict: v.optional(
      v.object({
        level: v.union(v.literal("green"), v.literal("amber")),
        reasons: v.array(v.string()),
        moreCount: v.number(),
        notes: v.array(v.string()),
      }),
    ),
    // amber 0, green 1, in progress 2; unset while the form is only open
    rank: v.optional(v.number()),
    recruiterState,
    shareToken: v.optional(v.string()),
    emailState: v.optional(v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"))),
    lastViewLoggedAt: v.optional(v.number()),
    webFindings: v.optional(v.object({ summary: v.string(), sources: v.array(v.string()) })),
  })
    .index("by_job_rank", ["jobId", "rank"])
    .index("by_session_token", ["sessionToken"])
    .index("by_share_token", ["shareToken"])
    .index("by_seeded", ["seeded"]),

  answers: defineTable({
    applicantId: v.id("applicants"),
    questionId: v.string(),
    kind: v.union(v.literal("safety"), v.literal("bot"), v.literal("claim")),
    value: v.string(),
    answeredAt: v.number(),
    expired: v.boolean(),
    pasted: v.boolean(),
    correct: v.optional(v.boolean()),
  }).index("by_applicant", ["applicantId"]),

  auditEvents: defineTable({
    applicantId: v.id("applicants"),
    jobId: v.id("jobs"),
    type: v.string(),
    actor: v.string(),
    at: v.number(),
    data: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  }).index("by_applicant", ["applicantId", "at"]),

  atsNotes: defineTable({
    applicantId: v.id("applicants"),
    note: v.string(),
    receivedAt: v.number(),
  }).index("by_applicant", ["applicantId"]),
});
