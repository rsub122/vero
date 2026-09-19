import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { APP_CONFIG } from "@/config/app-config";

import { PasscodeForm } from "./_components/passcode-form";

export const metadata: Metadata = { title: "Recruiter login · Vero" };

export default function LoginPage() {
  return (
    <div className="flex h-dvh">
      <div className="hidden bg-primary lg:block lg:w-1/3">
        <div className="flex h-full flex-col items-center justify-center p-12 text-center">
          <div className="space-y-6">
            <ShieldCheck className="mx-auto size-12 text-primary-foreground" aria-hidden="true" />
            <div className="space-y-2">
              <h1 className="font-light text-5xl text-primary-foreground">{APP_CONFIG.name}</h1>
              <p className="text-primary-foreground/80 text-xl">Other tools ask. We verify.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-2/3">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center">
            <ShieldCheck className="mx-auto size-8 lg:hidden" aria-hidden="true" />
            <h2 className="font-medium text-xl tracking-tight">Recruiter access</h2>
            <p className="text-muted-foreground text-sm">Enter the team passcode to see your applicants.</p>
          </div>
          <PasscodeForm />
        </div>
      </div>
    </div>
  );
}
