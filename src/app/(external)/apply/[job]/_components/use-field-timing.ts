import { useRef } from "react";

interface FieldTiming {
  ms: number;
  pastes: number;
}

/** Focus-to-blur time and paste count per field. Evidence only: the server's own stamps decide flags (R5). */
export function useFieldTiming() {
  const startedAt = useRef(Date.now());
  const focusedAt = useRef<Record<string, number>>({});
  const fields = useRef<Record<string, FieldTiming>>({});

  const entry = (name: string) => {
    fields.current[name] ??= { ms: 0, pastes: 0 };
    return fields.current[name];
  };

  return {
    track: (name: string) => ({
      onFocus: () => {
        focusedAt.current[name] = Date.now();
      },
      onBlurCapture: () => {
        const since = focusedAt.current[name];
        if (since) entry(name).ms += Date.now() - since;
        delete focusedAt.current[name];
      },
      onPaste: () => {
        entry(name).pastes += 1;
      },
    }),
    snapshot: () => ({ totalMs: Date.now() - startedAt.current, fields: fields.current }),
  };
}
