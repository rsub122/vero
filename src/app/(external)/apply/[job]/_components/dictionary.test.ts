import { expect, it } from "vitest";

import { dictionary } from "./dictionary";

it("es has every key en has, with no blanks", () => {
  expect(Object.keys(dictionary.es).sort()).toEqual(Object.keys(dictionary.en).sort());
  expect(Object.values(dictionary.es).every((text) => text.trim().length > 0)).toBe(true);
});
