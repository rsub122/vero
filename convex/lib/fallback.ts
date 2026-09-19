const STOP = new Set(["the", "and", "for", "with", "site", "inc", "llc", "los", "las", "del", "con"]);

function tokens(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/);
  return new Set(words.filter((w) => w.length >= 3 && !STOP.has(w)));
}

/**
 * Deterministic stand-in for the AI judge (R15). It can never return "conflict":
 * an infrastructure failure alone must not turn an applicant amber.
 */
export function consistencyFallback(formFields: string[], claimAnswers: string[]): "match" | "partial" {
  const claimed = tokens(formFields.join(" "));
  const answered = tokens(claimAnswers.join(" "));
  for (const word of answered) if (claimed.has(word)) return "match";
  return "partial";
}
