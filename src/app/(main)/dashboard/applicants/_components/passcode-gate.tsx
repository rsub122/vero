"use client";

import { type ReactNode, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation } from "convex/react";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { usePasscode } from "@/stores/recruiter-passcode";

/** Sends anyone without a confirmed passcode to /login before a recruiter query subscribes. */
export function PasscodeGate({ children }: { children: (passcode: string) => ReactNode }) {
  const router = useRouter();
  const { passcode, restored, set, restore } = usePasscode();
  const checkPasscode = useMutation(api.recruiter.checkPasscode);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  useEffect(restore, [restore]);

  useEffect(() => {
    if (!restored) return;
    if (!passcode) return router.replace("/login");
    if (confirmed === passcode) return;
    // A saved passcode is re-checked, so a changed one goes back to login instead of erroring.
    void checkPasscode({ passcode })
      .catch(() => false)
      .then((ok) => (ok ? setConfirmed(passcode) : set(null)));
  }, [restored, passcode, confirmed, checkPasscode, set, router]);

  if (!passcode || confirmed !== passcode) return <Skeleton className="h-64 w-full rounded-xl" />;
  return children(passcode);
}
