import { Suspense } from "react";
import JobDetailClient from "../../../jobs/[id]/JobDetailClient";

async function CandidateJobContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobDetailClient jobId={Number(id)} candidateMode />;
}

export default function CandidateJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl px-4 py-16 text-center text-slate-400">
          Memuat detail lowongan...
        </div>
      }
    >
      <CandidateJobContent params={params} />
    </Suspense>
  );
}
