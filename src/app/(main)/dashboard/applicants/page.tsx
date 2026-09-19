import type { Metadata } from "next";

import { ApplicantsBoard } from "./_components/applicants-board";

export const metadata: Metadata = { title: "Applicants · Vero" };

export default function Page() {
  return <ApplicantsBoard />;
}
