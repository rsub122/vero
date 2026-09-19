"use client";

import { useEffect, useState } from "react";

import { useMutation } from "convex/react";
import { Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface CallDialogProps {
  passcode: string;
  applicantId: Id<"applicants">;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CallDialog({ passcode, applicantId, name, open, onOpenChange }: CallDialogProps) {
  const logCall = useMutation(api.recruiter.logCall);
  const setOutcome = useMutation(api.recruiter.setOutcome);
  const [phone, setPhone] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    logCall({ passcode, applicantId })
      .then(setPhone)
      .catch(() => toast.error("Could not load the phone number"));
  }, [open, passcode, applicantId, logCall]);

  const decide = async (outcome: "confirmed" | "not_proceeding") => {
    await setOutcome({ passcode, applicantId, outcome }).catch(() => toast.error("Could not save the outcome"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Call {name}</DialogTitle>
          <DialogDescription>Check the reasons on the card, then record how the call went.</DialogDescription>
        </DialogHeader>
        {phone ? (
          <Button asChild variant="outline" size="lg" className="text-base tabular-nums">
            <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`}>
              <Phone aria-hidden="true" />
              {phone}
            </a>
          </Button>
        ) : (
          <Skeleton className="h-10 w-full" />
        )}
        <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={() => void decide("not_proceeding")}>
            Not proceeding
          </Button>
          <Button onClick={() => void decide("confirmed")}>Confirmed, send to PM</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
