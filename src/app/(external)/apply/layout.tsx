import type { ReactNode } from "react";

import type { Metadata } from "next";

import { VeroLogo } from "@/components/vero-logo";
import { APP_CONFIG } from "@/config/app-config";

import { LangContainer, LanguageToggle } from "./[job]/_components/language-toggle";

// Apply URLs carry session tokens: keep them out of search indexes.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function ApplyLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <LangContainer className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-background p-4 text-foreground">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold text-base">
          <VeroLogo className="size-6" />
          {APP_CONFIG.name}
        </span>
        <LanguageToggle />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </LangContainer>
  );
}
