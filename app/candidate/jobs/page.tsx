import { Suspense } from "react";
import DashboardShell from "../../../src/components/DashboardShell";
import JobBoard from "../../../src/components/JobBoard";

export default function CandidateJobsPage() {
  return (
    <DashboardShell role="candidate">
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-400">
            Memuat daftar lowongan...
          </div>
        }
      >
        <JobBoard variant="candidate" />
      </Suspense>
    </DashboardShell>
  );
}
