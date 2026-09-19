"use client";

import { Phone } from "lucide-react";

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

interface CallDialogProps {
  name: string;
  phone: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecide: (outcome: "confirmed" | "not_proceeding") => void;
}

export function CallDialog({ name, phone, open, onOpenChange, onDecide }: CallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Call {name}</DialogTitle>
          <DialogDescription>Check the reasons, then record how the call went.</DialogDescription>
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
          <Button variant="outline" onClick={() => onDecide("not_proceeding")}>
            Not proceeding
          </Button>
          <Button onClick={() => onDecide("confirmed")}>Confirmed, send to PM</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
