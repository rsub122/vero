"use client";

import { type ReactNode, useEffect } from "react";

import { Button } from "@/components/ui/button";

import { useLangStore } from "./dictionary";

export function LanguageToggle() {
  const { lang, setLang, restore } = useLangStore();
  useEffect(restore, [restore]);

  return (
    <fieldset className="flex gap-1" aria-label="Language / Idioma">
      {(["en", "es"] as const).map((code) => (
        <Button
          key={code}
          type="button"
          size="sm"
          variant={lang === code ? "secondary" : "ghost"}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {code === "en" ? "English" : "Español"}
        </Button>
      ))}
    </fieldset>
  );
}

export function LangContainer({ children, className }: { children: ReactNode; className?: string }) {
  const lang = useLangStore((s) => s.lang);
  return (
    <div lang={lang} className={className}>
      {children}
    </div>
  );
}
