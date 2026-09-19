"use client";

import { type FormEvent, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation } from "convex/react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import { usePasscode } from "@/stores/recruiter-passcode";

export function PasscodeForm() {
  const router = useRouter();
  const checkPasscode = useMutation(api.recruiter.checkPasscode);
  const setPasscode = usePasscode((s) => s.set);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    const ok = await checkPasscode({ passcode: draft }).catch(() => false);
    setError(!ok);
    if (!ok) return setChecking(false);
    setPasscode(draft);
    router.replace("/dashboard/applicants");
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field className="gap-1.5" data-invalid={error}>
        <FieldLabel htmlFor="recruiter-passcode">Passcode</FieldLabel>
        <Input
          id="recruiter-passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={draft}
          aria-invalid={error}
          onChange={(e) => setDraft(e.target.value)}
        />
        {error && <FieldError>That passcode did not work. Try again.</FieldError>}
      </Field>
      <Button type="submit" className="w-full" disabled={checking || draft === ""}>
        {checking ? "Checking…" : "Open applicants"}
      </Button>
    </form>
  );
}
