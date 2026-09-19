"use client";

import { useState } from "react";

import { ConvexError } from "convex/values";
import { Phone, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { CallDialog } from "./call-dialog";
import { useRecruiterActions } from "./use-recruiter-actions";
import { type ApplicantItem, laneOf, recruiterStateLabel } from "./verdict-config";

const failed = (fallback: string) => (error: unknown) =>
  toast.error(error instanceof ConvexError ? String(error.data) : fallback);

/** The one button per applicant (Call or Send to PM). The board updates before the server answers. */
export function ApplicantAction({ item, passcode }: { item: ApplicantItem; passcode: string }) {
  const { sendToPm, setOutcome, logCall } = useRecruiterActions();
  const [calling, setCalling] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const applicantId = item.id;
  const lane = laneOf(item);

  const send = () => {
    sendToPm({ passcode, applicantId })
      .then(() => toast.success(`${item.name} sent to the PM`))
      .catch(failed("Could not send to the PM"));
  };

  const call = () => {
    setPhone(null);
    setCalling(true);
    logCall({ passcode, applicantId }).then(setPhone).catch(failed("Could not load the phone number"));
  };

  // Close at once; mutations from one client run in order, so the confirm lands before the send.
  const decide = (outcome: "confirmed" | "not_proceeding") => {
    setCalling(false);
    setOutcome({ passcode, applicantId, outcome }).catch(failed("Could not save the outcome"));
    if (outcome === "confirmed") send();
  };

  if (lane === "checking") return <span className="text-muted-foreground text-xs">{item.step}</span>;
  if (lane === "done")
    return <span className="text-muted-foreground text-xs">{recruiterStateLabel[item.recruiterState]}</span>;

  return (
    <>
      {lane === "call" || lane === "bots" ? (
        <Button size="sm" variant={lane === "bots" ? "outline" : "default"} onClick={call}>
          <Phone aria-hidden="true" />
          {lane === "bots" ? "Call anyway" : "Call"}
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={send}>
          <Send aria-hidden="true" />
          Send to PM
        </Button>
      )}
      <CallDialog name={item.name} phone={phone} open={calling} onOpenChange={setCalling} onDecide={decide} />
    </>
  );
}
