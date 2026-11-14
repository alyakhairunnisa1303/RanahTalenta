import { Suspense } from "react";
import JobDetailClient from "./JobDetailClient";

async function JobContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JobDetailClient jobId={Number(id)} />;
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl p-12 text-center text-slate-400">
          Memuat rincian pekerjaan...
        </div>
      }
    >
      <JobContent params={params} />
    </Suspense>
  );
}
