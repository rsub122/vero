import { expect, it } from "vitest";

import { botTrapOk, cardCheck, isValidPastDay, normalizeProvider, safetyScore } from "./checks";
import { BOT_TRAP } from "./questions";

const NOW = Date.UTC(2026, 8, 19);

it("normalizes provider names to one key", () => {
  expect(normalizeProvider("Turner Safety, LLC.")).toBe(normalizeProvider("turner safety"));
});

it("rejects future and malformed issue dates", () => {
  expect(isValidPastDay("2026-09-20", NOW)).toBe(false);
  expect(isValidPastDay("2026-09-19", NOW)).toBe(true);
  expect(isValidPastDay("soon", NOW)).toBe(false);
});

it("card issued exactly 5 years ago is expired; a day less is expiring", () => {
  expect(cardCheck("2021-09-19", NOW).status).toBe("expired");
  expect(cardCheck("2021-09-20", NOW).status).toBe("expiring");
  expect(cardCheck("2024-09-19", NOW).status).toBe("valid");
  expect(cardCheck(undefined, NOW).status).toBe("none");
});

it("bot-trap accepts equivalent forms only", () => {
  for (const ok of ["4", " four ", "Cuatro"]) expect(botTrapOk(ok, BOT_TRAP.accepted)).toBe(true);
  for (const bad of ["5", ""]) expect(botTrapOk(bad, BOT_TRAP.accepted)).toBe(false);
});

it("expired safety answers count as incorrect", () => {
  expect(
    safetyScore([
      { kind: "safety", correct: true, expired: false },
      { kind: "safety", correct: true, expired: true },
      { kind: "bot", correct: true, expired: false },
    ]),
  ).toBe(1);
});
