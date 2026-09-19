import { Suspense } from "react";

import { CheckRunner } from "./_components/check-runner";

export default async function CheckPage({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  return (
    <Suspense>
      <CheckRunner slug={job} />
    </Suspense>
  );
}
