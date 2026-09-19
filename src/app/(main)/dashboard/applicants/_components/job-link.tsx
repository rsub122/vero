"use client";

import { useEffect, useState } from "react";

import { Copy, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function JobLink({ slug, title }: { slug: string; title: string }) {
  const [url, setUrl] = useState(`/apply/${slug}`);
  useEffect(() => setUrl(`${window.location.origin}/apply/${slug}`), [slug]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Apply link copied");
    } catch {
      toast.error("Could not copy. Select the link instead.");
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button variant="outline" size="sm" onClick={copy}>
        <Copy aria-hidden="true" />
        Copy link
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm">
            <QrCode aria-hidden="true" />
            Show QR
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scan to apply</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center rounded-lg bg-white p-6">
            <QRCodeSVG value={url} size={260} marginSize={1} title={`Apply link for ${title}`} />
          </div>
          <p className="break-all text-center text-muted-foreground text-xs">{url}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
