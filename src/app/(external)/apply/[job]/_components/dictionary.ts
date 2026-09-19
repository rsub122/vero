import { create } from "zustand";

export type Lang = "en" | "es";

const en = {
  tagline: "Quick pre-check. About 2 minutes.",
  jobNotFound: "This job link is not active.",
  loading: "Loading…",
  name: "Full name",
  phone: "Phone number",
  yearsInTrade: "Years in the trade",
  lastEmployer: "Last employer",
  lastSite: "Last job site",
  hasCard: "Do you have an SST or OSHA 30 card?",
  yes: "Yes",
  no: "No",
  provider: "Training provider",
  providerPick: "Choose your provider",
  providerSearch: "Search providers…",
  providerNone: "No provider found.",
  providerOther: "Other (type the name)",
  providerOtherLabel: "Provider name",
  cardId: "Card ID number",
  cardIssueDate: "Card issue date",
  startDate: "When can you start?",
  hasTransport: "Do you have a way to get to the site?",
  submit: "Continue",
  submitting: "Sending…",
  required: "Required",
  phoneInvalid: "Enter a valid phone number",
  yearsInvalid: "Enter a number from 0 to 70",
  dateFuture: "This date cannot be in the future",
  submitFailed: "Something went wrong. Please try again.",
  introTitle: "One last step: a short timed check",
  introBody: "6 quick questions, about one minute. Each one has a timer, so answer in your own words and keep going.",
  start: "Start",
  questionOf: "Question {n} of {total}",
  secondsLeft: "{n}s left",
  next: "Next",
  answerPlaceholder: "Type your answer",
  reconnecting: "Reconnecting…",
  doneTitle: "Thank you. You're all set.",
  doneBody: "We got your application. The hiring team will contact you about next steps.",
};

const es: typeof en = {
  tagline: "Verificación rápida. Unos 2 minutos.",
  jobNotFound: "Este enlace de trabajo no está activo.",
  loading: "Cargando…",
  name: "Nombre completo",
  phone: "Número de teléfono",
  yearsInTrade: "Años en el oficio",
  lastEmployer: "Último empleador",
  lastSite: "Última obra",
  hasCard: "¿Tiene tarjeta SST u OSHA 30?",
  yes: "Sí",
  no: "No",
  provider: "Proveedor de capacitación",
  providerPick: "Elija su proveedor",
  providerSearch: "Buscar proveedores…",
  providerNone: "No se encontró el proveedor.",
  providerOther: "Otro (escriba el nombre)",
  providerOtherLabel: "Nombre del proveedor",
  cardId: "Número de la tarjeta",
  cardIssueDate: "Fecha de emisión de la tarjeta",
  startDate: "¿Cuándo puede empezar?",
  hasTransport: "¿Tiene cómo llegar a la obra?",
  submit: "Continuar",
  submitting: "Enviando…",
  required: "Obligatorio",
  phoneInvalid: "Escriba un número de teléfono válido",
  yearsInvalid: "Escriba un número de 0 a 70",
  dateFuture: "Esta fecha no puede ser futura",
  submitFailed: "Algo salió mal. Inténtelo de nuevo.",
  introTitle: "Un último paso: una verificación corta con tiempo",
  introBody: "6 preguntas rápidas, cerca de un minuto. Cada una tiene un reloj; responda con sus palabras y siga.",
  start: "Empezar",
  questionOf: "Pregunta {n} de {total}",
  secondsLeft: "Quedan {n}s",
  next: "Siguiente",
  answerPlaceholder: "Escriba su respuesta",
  reconnecting: "Reconectando…",
  doneTitle: "Gracias. Ya está todo.",
  doneBody: "Recibimos su solicitud. El equipo de contratación le avisará los próximos pasos.",
};

export const dictionary = { en, es };
export type Copy = typeof en;

const STORAGE_KEY = "vero-lang";

// English on the server and first paint; the toggle restores a saved choice after mount.
export const useLangStore = create<{ lang: Lang; setLang: (lang: Lang) => void; restore: () => void }>((set) => ({
  lang: "en",
  setLang: (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage blocked: the choice just does not persist
    }
    set({ lang });
  },
  restore: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) ?? navigator.language.slice(0, 2);
      if (saved === "es") set({ lang: "es" });
    } catch {
      // storage blocked: the choice just does not persist
    }
  },
}));

export function useCopy(): { lang: Lang; t: Copy } {
  const lang = useLangStore((s) => s.lang);
  return { lang, t: dictionary[lang] };
}

// Session token per job. Storage can throw in locked-down browsers; the URL copy still works.
export const sessionStore = {
  get(job: string): string | null {
    try {
      return localStorage.getItem(`vero-session-${job}`);
    } catch {
      return null;
    }
  },
  set(job: string, token: string | null) {
    try {
      if (token) localStorage.setItem(`vero-session-${job}`, token);
      else localStorage.removeItem(`vero-session-${job}`);
    } catch {
      // storage blocked: the choice just does not persist
    }
  },
};
