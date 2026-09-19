import type { Metadata } from "next";

import { CandidateSummary } from "./_components/candidate-summary";

// The URL is the credential: keep it out of search indexes and Referer headers.
export const metadata: Metadata = { title: "Candidate · Vero", robots: { index: false, follow: false } };

export default async function CandidatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-background p-4 text-foreground">
      <CandidateSummary token={token} />
    </main>
  );
}
