import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { logEvent } from "./audit";
import { botTrapOk } from "./lib/checks";
import { ANSWER_GRACE_MS, MAX_ANSWER_TEXT, QUESTION_SECONDS } from "./lib/constants";
import {
  BOT_TRAP,
  FIRST_CLAIM_INDEX,
  questionId,
  questionKind,
  SAFETY_QUESTIONS,
  TOTAL_QUESTIONS,
} from "./lib/questions";

/** Only the current question's text, choices, kind and deadline. No correct marker, no verdict data (KTD3). */
export const currentQuestion = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a = await ctx.db
      .query("applicants")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", token))
      .unique();
    if (!a) return { state: "unknown" as const };
    if (a.status === "started") return { state: "form" as const };
    if (a.status === "submitted") return { state: "intro" as const, total: TOTAL_QUESTIONS };
    if (a.status !== "checking" || a.questionShownAt === undefined) return { state: "done" as const };

    const index = a.questionIndex;
    const kind = questionKind(index);
    const safety = kind === "safety" ? SAFETY_QUESTIONS[index] : undefined;
    const text =
      safety?.text[a.language] ??
      (kind === "bot" ? BOT_TRAP.text[a.language] : (a.claimQuestions?.items[index - FIRST_CLAIM_INDEX] ?? ""));
    return {
      state: "question" as const,
      index,
      total: TOTAL_QUESTIONS,
      kind,
      text,
      choices: safety?.choices[a.language],
      seconds: QUESTION_SECONDS[kind],
      deadline: a.questionShownAt + QUESTION_SECONDS[kind] * 1000,
    };
  },
});

export const beginCheck = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const a = await ctx.db
      .query("applicants")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", token))
      .unique();
    if (a?.status !== "submitted") return;
    await ctx.db.patch(a._id, { status: "checking", questionIndex: 0, questionShownAt: Date.now() });
    await logEvent(ctx, a, "check_started", "applicant");
  },
});

export const answerQuestion = mutation({
  args: { token: v.string(), index: v.number(), value: v.string(), pasted: v.boolean() },
  handler: async (ctx, args) => {
    const a = await ctx.db
      .query("applicants")
      .withIndex("by_session_token", (q) => q.eq("sessionToken", args.token))
      .unique();
    // A finished or unknown session is not an error: the client just moves to the thank-you page.
    if (a?.status !== "checking" || a.questionShownAt === undefined) return { done: true };
    // Write-once: an answer for any question but the current one is a no-op (R9).
    if (args.index !== a.questionIndex) return { done: false };

    const now = Date.now();
    const kind = questionKind(a.questionIndex);
    const expired = now > a.questionShownAt + QUESTION_SECONDS[kind] * 1000 + ANSWER_GRACE_MS;
    const value = args.value.slice(0, MAX_ANSWER_TEXT);
    let correct: boolean | undefined;
    if (kind === "safety")
      correct = !expired && value !== "" && Number(value) === SAFETY_QUESTIONS[a.questionIndex].correct;
    if (kind === "bot") correct = !expired && botTrapOk(value, BOT_TRAP.accepted);

    await ctx.db.insert("answers", {
      applicantId: a._id,
      questionId: questionId(a.questionIndex),
      kind,
      value,
      answeredAt: now,
      expired,
      pasted: kind === "claim" && args.pasted,
      correct,
    });
    await logEvent(ctx, a, "question_answered", "applicant", { question: questionId(a.questionIndex), expired });

    const next = a.questionIndex + 1;
    if (next < TOTAL_QUESTIONS) {
      await ctx.db.patch(a._id, { questionIndex: next, questionShownAt: now });
      return { done: false };
    }
    await ctx.db.patch(a._id, { status: "completed", questionIndex: next, questionShownAt: undefined });
    await logEvent(ctx, a, "check_completed", "applicant");
    await ctx.scheduler.runAfter(0, internal.ai.judge, { applicantId: a._id });
    return { done: true };
  },
});
