import { expect, it } from "vitest";

import { auditCsv, csvCell } from "./export-audit";

it("commas, quotes and newlines stay inside one cell", () => {
  expect(csvCell('Ortiz, "Sam"\nline 2')).toBe('"Ortiz, ""Sam""\nline 2"');
});

it("formula-looking values are neutralized", () => {
  expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  expect(csvCell("-1+2")).toBe('"\'-1+2"');
});

it("one header plus one line per event", () => {
  const csv = auditCsv("Ana", [
    { at: 0, actor: "system", type: "verdict_issued", label: "Verdict issued", data: { level: "green" } },
  ]);
  expect(csv.split("\r\n")).toHaveLength(2);
  expect(csv).toContain('"level=green"');
});
