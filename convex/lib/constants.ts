// Every threshold the verdict and the timed check depend on lives here.
export const FORM_MIN_SECONDS = 25;
export const CARD_VALID_YEARS = 5;
export const CARD_EXPIRING_MONTHS = 12;
export const QUESTION_SECONDS = { safety: 15, bot: 10, claim: 20 } as const;
export const ANSWER_GRACE_MS = 2_000;
export const ABANDON_MS = 10 * 60 * 1000;
export const ABANDON_RECENT_MS = 2 * 60 * 1000;
// Measured: warm calls 1.3-2.3s, the first call after idle ran past 3.5s and fell back. 7s keeps the model result.
export const JUDGE_TIMEOUT_MS = 7_000;
export const QUESTION_GEN_TIMEOUT_MS = 8_000;
export const AI_CALLS_PER_JOB_PER_HOUR = 120;
export const AI_WINDOW_MS = 60 * 60 * 1000;
export const MAX_SHORT_TEXT = 120;
export const MAX_ANSWER_TEXT = 300;
export const MAX_REASON_TEXT = 240;
export const VIEW_LOG_WINDOW_MS = 60 * 60 * 1000;
// One small, fast model for both AI calls; latency matters more than depth.
export const AI_MODEL = "gpt-4.1-mini";
