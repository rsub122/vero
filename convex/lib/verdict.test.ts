import { describe, expect, it } from "vitest";

import { behaviorFlags, cardCheck } from "./checks";
import { type CheckResults, computeVerdict, countApplicants } from "./verdict";

const NOW = Date.UTC(2026, 8, 19);
const clean: CheckResults = {
  provider: "clear",
  card: "valid",
  cardExpiresAt: Date.UTC(2029, 8, 19),
  consistency: "match",
  safetyScore: 3,
  flags: [],
  formSeconds: 70,
};

describe("computeVerdict", () => {
  it("AE1 honest applicant is green with three positive reasons", () => {
    const v = computeVerdict(clean);
    expect(v.level).toBe("green");
    expect(v.reasons).toEqual([
      "Training provider verified",
      "Card valid until Sep 2029",
      "Answers consistent, safety 3 of 3",
    ]);
    expect(v.notes).toEqual([]);
  });

  it("AE2 partial stays green with a note; fallback source changes nothing", () => {
    const v = computeVerdict({ ...clean, consistency: "partial" });
    expect(v.level).toBe("green");
    expect(v.notes).toHaveLength(1);
  });

  it("AE4 expiring card stays green and names the expiry month", () => {
    const card = cardCheck("2022-06-19", NOW);
    expect(card.status).toBe("expiring");
    const v = computeVerdict({ ...clean, card: card.status, cardExpiresAt: card.expiresAt });
    expect(v.level).toBe("green");
    expect(v.notes).toEqual(["Card expires Jun 2027"]);
  });

  it("AE5 no card is amber with the no-card reason first", () => {
    const v = computeVerdict({ ...clean, provider: "no_card", card: "none", cardExpiresAt: undefined });
    expect(v.level).toBe("amber");
    expect(v.reasons[0]).toBe("No SST or OSHA 30 card on file");
    expect(v.reasons).toHaveLength(1);
  });

  it("AE6 bot: 8 second form and failed bot-trap", () => {
    const flags = behaviorFlags({
      startedAt: 0,
      submittedAt: 8000,
      botTrapPassed: false,
      claimAnswerPasted: false,
      completed: true,
    });
    const v = computeVerdict({ ...clean, flags, formSeconds: 8, safetyScore: 2 });
    expect(v.level).toBe("amber");
    expect(v.reasons).toEqual(["Failed the bot-check question", "Form completed in 8 seconds"]);
  });

  it("five amber causes give three reasons in severity order and two more", () => {
    const v = computeVerdict({
      ...clean,
      provider: "revoked",
      card: "expired",
      cardExpiresAt: Date.UTC(2026, 4, 19),
      consistency: "conflict",
      safetyScore: 0,
      flags: ["bot_trap_failed"],
    });
    expect(v.reasons).toEqual([
      "Training provider is on the revoked list",
      "Safety card expired May 2026",
      "Failed the bot-check question",
    ]);
    expect(v.moreCount).toBe(2);
    expect(v.rank).toBe(0);
  });

  it("safety threshold, unknown provider, paste and abandon rules", () => {
    expect(computeVerdict({ ...clean, safetyScore: 1 }).level).toBe("amber");
    expect(computeVerdict({ ...clean, safetyScore: 2 }).level).toBe("green");
    expect(computeVerdict({ ...clean, provider: "unknown" }).reasons).toEqual([
      "Training provider is not on the verified list",
    ]);
    expect(computeVerdict({ ...clean, flags: ["pasted_answers"] }).level).toBe("amber");
    expect(
      computeVerdict({ ...clean, consistency: "skipped", safetyScore: 0, flags: ["check_not_completed"] }).reasons,
    ).toContain("Check not completed");
  });

  it("seeded shapes give their scripted reasons", () => {
    expect(computeVerdict({ ...clean, provider: "revoked", safetyScore: 0 }).reasons).toEqual([
      "Training provider is on the revoked list",
      "Safety score 0 of 3",
    ]);
    const expired = cardCheck("2021-05-19", NOW);
    expect(computeVerdict({ ...clean, card: expired.status, cardExpiresAt: expired.expiresAt }).reasons).toEqual([
      "Safety card expired May 2026",
    ]);
  });
});

describe("behaviorFlags", () => {
  const base = { startedAt: 0, botTrapPassed: true, claimAnswerPasted: false, completed: true };
  it("24 seconds is flagged, 25 is not", () => {
    expect(behaviorFlags({ ...base, submittedAt: 24_000 })).toEqual(["form_too_fast"]);
    expect(behaviorFlags({ ...base, submittedAt: 25_000 })).toEqual([]);
  });
  it("pasted claim answer flags; unfinished check flags once", () => {
    expect(behaviorFlags({ ...base, submittedAt: 60_000, claimAnswerPasted: true })).toEqual(["pasted_answers"]);
    expect(behaviorFlags({ ...base, submittedAt: 60_000, botTrapPassed: false, completed: false })).toEqual([
      "check_not_completed",
    ]);
  });
});

it("AE8 counter", () => {
  const rows = [
    ...Array.from({ length: 3 }, () => ({ level: "amber" as const, recruiterState: "new" as const })),
    { level: "amber" as const, recruiterState: "confirmed" as const },
    ...Array.from({ length: 10 }, () => ({ level: "green" as const, recruiterState: "new" as const })),
    { recruiterState: "new" as const },
  ];
  expect(countApplicants(rows)).toEqual({ total: 14, needCall: 3, likelyBots: 0, confirmed: 11, inProgress: 1 });
});

it("likely bots leave the call count and are not counted as confirmed", () => {
  const rows = [
    { level: "amber" as const, recruiterState: "new" as const, likelyBot: true },
    { level: "amber" as const, recruiterState: "new" as const },
    { level: "green" as const, recruiterState: "new" as const },
  ];
  expect(countApplicants(rows)).toEqual({ total: 3, needCall: 1, likelyBots: 1, confirmed: 1, inProgress: 0 });
});
