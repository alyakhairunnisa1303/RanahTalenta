"use client";

import { getUser } from "../data/mockData";
import { useAllJobs } from "../lib/use-all-jobs";

export default function PublicStats() {
  const jobs = useAllJobs();
  const openJobs = jobs.filter((job) => job.status === "open");
  const verifiedCompanies = new Set(
    openJobs
      .filter((job) => getUser(job.hrd_id)?.is_verified)
      .map((job) => job.hrd_id)
  ).size;

  const stats = [
    { value: String(openJobs.length), label: "Lowongan terbuka" },
    { value: String(verifiedCompanies), label: "Perusahaan terverifikasi" },
    { value: "4", label: "Tahap analisis AI per CV" },
    { value: "1 klik", label: "Untuk melamar" },
  ];

  return (
    <section className="border-y-2 border-ink-900 bg-accent-400 text-ink-950">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 md:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`px-4 ${
              index > 0 ? "md:border-l-2 md:border-ink-900/20" : ""
            }`}
          >
            <p className="text-4xl font-extrabold tracking-tight tabular-nums">
              {stat.value}
            </p>
            <p className="mt-1 text-sm font-semibold">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
