// Server-only: correct answers live here and never reach the client (R10).
export type Lang = "en" | "es";
export type QuestionKind = "safety" | "bot" | "claim";
type Text = Record<Lang, string>;

export const SAFETY_QUESTIONS: { id: string; text: Text; choices: Record<Lang, string[]>; correct: number }[] = [
  {
    id: "safety-1",
    text: {
      en: "You are working 6 feet or more above a lower level with no guardrail. What do you need?",
      es: "Trabaja a 6 pies o más sobre un nivel inferior y no hay baranda. ¿Qué necesita?",
    },
    choices: {
      en: ["A hard hat is enough", "Fall protection, such as a harness tied off", "A spotter on the ground", "Nothing"],
      es: ["Con el casco basta", "Protección contra caídas, como un arnés anclado", "Un vigía abajo", "Nada"],
    },
    correct: 1,
  },
  {
    id: "safety-2",
    text: {
      en: "A scaffold has a red tag on it. What does that mean?",
      es: "Un andamio tiene una etiqueta roja. ¿Qué significa?",
    },
    choices: {
      en: ["Safe to use", "Use with a harness only", "Do not use it", "It was inspected today"],
      es: ["Es seguro usarlo", "Usar solo con arnés", "No usarlo", "Fue inspeccionado hoy"],
    },
    correct: 2,
  },
  {
    id: "safety-3",
    text: {
      en: "You need to service a machine that could start up. What do you do first?",
      es: "Debe dar servicio a una máquina que podría arrancar. ¿Qué hace primero?",
    },
    choices: {
      en: ["Tell a coworker to watch", "Work fast", "Lock out and tag out the power", "Wear gloves"],
      es: ["Pedir a un compañero que vigile", "Trabajar rápido", "Bloquear y etiquetar la energía", "Usar guantes"],
    },
    correct: 2,
  },
];

// ponytail: one fixed bot-trap so the stage run is predictable; add a pool if bots learn it.
export const BOT_TRAP = {
  id: "bot",
  text: {
    en: "Quick check: what is two plus two? Type the answer.",
    es: "Verificación rápida: ¿cuánto es dos más dos? Escriba la respuesta.",
  } satisfies Text,
  accepted: ["4", "four", "cuatro"],
};

export const CLAIM_IDS = ["claim-1", "claim-2"] as const;
export const TOTAL_QUESTIONS = SAFETY_QUESTIONS.length + 1 + CLAIM_IDS.length;
export const FIRST_CLAIM_INDEX = SAFETY_QUESTIONS.length + 1;

export function questionKind(index: number): QuestionKind {
  if (index < SAFETY_QUESTIONS.length) return "safety";
  return index === SAFETY_QUESTIONS.length ? "bot" : "claim";
}

export function questionId(index: number): string {
  if (index < SAFETY_QUESTIONS.length) return SAFETY_QUESTIONS[index].id;
  return index === SAFETY_QUESTIONS.length ? BOT_TRAP.id : CLAIM_IDS[index - FIRST_CLAIM_INDEX];
}

/** Fallback claim questions filled from the applicant's own answers (R7, AE5). */
export function templateClaimQuestions(
  form: { lastEmployer: string; lastSite: string; hasCard: boolean; providerName?: string },
  lang: Lang,
): [string, string] {
  const provider = form.providerName ?? "";
  if (lang === "es") {
    return [
      `Dijo que trabajó con ${form.lastEmployer} en ${form.lastSite}. ¿Qué hacía allí día a día?`,
      form.hasCard
        ? `¿Dónde tomó su curso de seguridad con ${provider} y cuánto duró?`
        : "¿Qué capacitación de seguridad ha recibido en sus trabajos anteriores?",
    ];
  }
  return [
    `You said you worked for ${form.lastEmployer} at ${form.lastSite}. What was your day-to-day work there?`,
    form.hasCard
      ? `Where did you take your safety course with ${provider}, and how long did it run?`
      : "What safety training have you had on your past jobs?",
  ];
}
