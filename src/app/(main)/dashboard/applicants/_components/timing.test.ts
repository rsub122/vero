import { describe, expect, it } from "vitest";

import { applicationTiming, formatDuration } from "./timing";

describe("applicationTiming", () => {
  it("splits form, check and total time from the audit trail", () => {
    const t = applicationTiming([
      { type: "application_started", at: 0 },
      { type: "form_submitted", at: 96_000 },
      { type: "check_started", at: 101_000 },
      { type: "question_answered", at: 110_000 },
      { type: "check_completed", at: 155_000 },
    ]);
    expect(t).toEqual({ formMs: 96_000, checkMs: 54_000, totalMs: 155_000 });
  });

  it("uses the abandon time and leaves missing steps undefined", () => {
    expect(
      applicationTiming([
        { type: "check_started", at: 5 },
        { type: "check_abandoned", at: 65 },
      ]),
    ).toEqual({
      formMs: undefined,
      checkMs: 60,
      totalMs: undefined,
    });
  });
});

describe("formatDuration", () => {
  it("formats seconds and minutes", () => {
    expect(formatDuration(8_000)).toBe("8s");
    expect(formatDuration(96_000)).toBe("1m 36s");
    expect(formatDuration(undefined)).toBe("—");
  });
});
