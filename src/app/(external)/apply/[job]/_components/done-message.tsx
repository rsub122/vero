"use client";

import { useEffect } from "react";

import { CircleCheck } from "lucide-react";

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import { sessionStore, useCopy } from "./dictionary";

/** Neutral by design: no verdict, score or flag ever reaches the applicant (R11). */
export function DoneMessage({ slug }: { slug: string }) {
  const { t } = useCopy();
  useEffect(() => sessionStore.set(slug, null), [slug]);

  return (
    <Empty className="flex-1">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleCheck aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{t.doneTitle}</EmptyTitle>
        <EmptyDescription>{t.doneBody}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
