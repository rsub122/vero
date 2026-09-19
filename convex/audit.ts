import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

// Every event type and its plain-word label. logEvent accepts nothing else.
export const EVENT_LABELS = {
  application_started: "Opened the application",
  form_submitted: "Submitted the form",
  claim_questions_generated: "AI wrote the claim questions",
  check_started: "Started the timed check",
  question_answered: "Answered a question",
  check_completed: "Finished the timed check",
  check_abandoned: "Did not finish the check in time",
  verification_run: "Verification ran",
  verdict_issued: "Verdict issued",
  provider_lookup: "Looked up the provider on the web",
  call_initiated: "Recruiter opened the phone number",
  call_outcome: "Recruiter recorded the call outcome",
  sent_to_pm: "Sent to PM",
  ats_webhook_sent: "Note recorded in the ATS",
  email_sent: "Foreman email sent",
  email_failed: "Foreman email failed",
  email_retry: "Foreman email retried",
  candidate_page_viewed: "Candidate page viewed",
  audit_exported: "Audit log exported",
} as const;

export type EventType = keyof typeof EVENT_LABELS;
export type Actor = "applicant" | "system" | "recruiter" | "foreman" | "seed";
type EventData = Record<string, string | number | boolean>;

/** Append-only. Called inside every state-changing mutation (KTD9). */
export async function logEvent(
  ctx: MutationCtx,
  applicant: { _id: Id<"applicants">; jobId: Id<"jobs"> },
  type: EventType,
  actor: Actor,
  data?: EventData,
  at: number = Date.now(),
) {
  await ctx.db.insert("auditEvents", { applicantId: applicant._id, jobId: applicant.jobId, type, actor, at, data });
}
