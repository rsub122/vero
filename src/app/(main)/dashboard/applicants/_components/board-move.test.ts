import { describe, expect, it } from "vitest";

import { boardMove, laneOf } from "./verdict-config";

const amber = { level: "amber" as const, reasons: [], moreCount: 0, notes: [] };
const green = { ...amber, level: "green" as const };

describe("boardMove", () => {
  it("maps forward drags to recruiter actions", () => {
    expect(boardMove({ verdict: amber, recruiterState: "new" }, "ready").kind).toBe("confirm");
    expect(boardMove({ verdict: amber, recruiterState: "called" }, "done").kind).toBe("not_proceeding");
    expect(boardMove({ verdict: green, recruiterState: "new" }, "done").kind).toBe("send");
  });

  it("lets a call outcome be undone but never a hand-off", () => {
    expect(boardMove({ verdict: amber, recruiterState: "confirmed" }, "call").kind).toBe("reopen");
    expect(boardMove({ verdict: amber, recruiterState: "not_proceeding" }, "call").kind).toBe("reopen");
    expect(boardMove({ verdict: amber, recruiterState: "not_proceeding" }, "ready").kind).toBe("confirm");
    expect(boardMove({ verdict: green, recruiterState: "sent" }, "ready").kind).toBe("refuse");
  });

  it("refuses moves that would change a verdict or skip the check", () => {
    expect(boardMove({ verdict: green, recruiterState: "new" }, "call").kind).toBe("refuse");
    expect(boardMove({ verdict: undefined, recruiterState: "new" }, "ready").kind).toBe("refuse");
    expect(boardMove({ verdict: amber, recruiterState: "new" }, "checking").kind).toBe("refuse");
    expect(boardMove({ verdict: amber, recruiterState: "new" }, "call").kind).toBe("none");
  });

  it("keeps likely bots out of the call lane but lets a recruiter decide on them", () => {
    const bot = { verdict: amber, recruiterState: "new" as const, likelyBot: true };
    expect(laneOf(bot)).toBe("bots");
    expect(boardMove(bot, "call").kind).toBe("refuse");
    expect(boardMove(bot, "ready").kind).toBe("confirm");
    expect(boardMove(bot, "done").kind).toBe("not_proceeding");
    expect(boardMove({ verdict: amber, recruiterState: "new" }, "bots").kind).toBe("refuse");
  });
});
