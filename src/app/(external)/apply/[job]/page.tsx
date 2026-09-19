import { ApplyForm } from "./_components/apply-form";

export default async function ApplyPage({ params }: { params: Promise<{ job: string }> }) {
  const { job } = await params;
  return <ApplyForm slug={job} />;
}
