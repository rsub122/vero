import { DoneMessage } from "../_components/done-message";

export default async function DonePage({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  return <DoneMessage slug={job} />;
}
