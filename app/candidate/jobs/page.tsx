import { Suspense } from "react";
import JobBoard from "../../../src/components/JobBoard";

export default function CandidateJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-slate-400 sm:px-6">
          Memuat daftar lowongan...
        </div>
      }
    >
      <JobBoard variant="candidate" />
    </Suspense>
  );
}
