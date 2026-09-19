"use client";

import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { useMutation } from "convex/react";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

import { usePasscode } from "./use-passcode";

/** Confirms the passcode through a gated mutation before any recruiter query subscribes. */
export function PasscodeGate({ children }: { children: (passcode: string) => ReactNode }) {
  const { passcode, restored, set, restore } = usePasscode();
  const checkPasscode = useMutation(api.recruiter.checkPasscode);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const [confirmed, setConfirmed] = useState<string | null>(null);

  useEffect(restore, [restore]);

  // A saved passcode is re-checked before any query subscribes, so a stale one re-prompts instead of erroring.
  useEffect(() => {
    if (!passcode || confirmed === passcode) return;
    void checkPasscode({ passcode })
      .catch(() => false)
      .then((ok) => (ok ? setConfirmed(passcode) : set(null)));
  }, [passcode, confirmed, checkPasscode, set]);

  if (!restored || (passcode && confirmed !== passcode)) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (passcode) return children(passcode);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    const ok = await checkPasscode({ passcode: draft }).catch(() => false);
    setChecking(false);
    setError(!ok);
    if (ok) {
      setConfirmed(draft);
      set(draft);
    }
  };

  return (
    <Card className="mx-auto mt-12 w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole className="size-4" aria-hidden="true" />
          Recruiter access
        </CardTitle>
        <CardDescription>Enter the team passcode to see applicants.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field className="gap-1.5" data-invalid={error}>
            <FieldLabel htmlFor="recruiter-passcode">Passcode</FieldLabel>
            <Input
              id="recruiter-passcode"
              type="password"
              autoComplete="current-password"
              value={draft}
              aria-invalid={error}
              onChange={(e) => setDraft(e.target.value)}
            />
            {error && <FieldError>That passcode did not work. Try again.</FieldError>}
          </Field>
          <Button type="submit" disabled={checking || draft === ""}>
            Open applicants
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
