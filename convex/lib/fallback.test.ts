import { expect, it } from "vitest";

import { consistencyFallback } from "./fallback";

const form = ["Turner Construction", "Mercy Hospital", "Apex Safety Training"];

it("AE3 overlapping tokens match, ignoring case and punctuation", () => {
  expect(consistencyFallback(form, ["framing at the MERCY, hospital job", ""])).toBe("match");
});

it("empty or unrelated answers are partial, never conflict", () => {
  expect(consistencyFallback(form, ["", ""])).toBe("partial");
  expect(consistencyFallback(form, ["I never worked there", "no idea"])).toBe("partial");
});
