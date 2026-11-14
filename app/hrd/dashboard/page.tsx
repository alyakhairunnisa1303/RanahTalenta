"use client";

import Link from "next/link";
import Icon from "../../../src/components/Icons";
import {
  AiInsight,
  CountUp,
  Hero,
  HeroStat,
} from "../../../src/components/AiUi";
import {
  jobStatusMeta,
} from "../../../src/data/mockData";
import { formatDate } from "../../../src/lib/format";
import { useAllApplications } from "../../../src/lib/use-all-applications";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import { useCurrentUser } from "../../../src/lib/use-current-user";

export default function HrdDashboard() {
  const allJobs = useAllJobs();
  const applications = useAllApplications();
  const { user: hrd } = useCurrentUser();

  const myJobs = allJobs.filter((j) => j.hrd_id === hrd?.id);

  const rowsByJob = myJobs.map((job) => {
    const apps = applications.filter((application) => application.job_id === job.id);
    return {
      job,
      total: apps.length,
      high: apps.filter((application) => (application.match_score ?? 0) >= 80).length,
    };
  });

  const myApplications = applications.filter((application) =>
    myJobs.some((job) => job.id === application.job_id)
  );

  const openJobs = myJobs.filter((j) => j.status === "open").length;
  const total = myApplications.length;
  const high = myApplications.filter((application) => (application.match_score ?? 0) >= 80).length;
  const mid = myApplications.filter((application) => {
    const score = application.match_score ?? 0;
    return score >= 60 && score < 80;
  }).length;
  const low = total - high - mid;
  const pct = (n: number) => (total ? (n / total) * 100 : 0);

  const topJob = [...rowsByJob].sort((a, b) => b.high - a.high)[0];

  const distribution = [
    { label: "Highly Recommended", count: high, bar: "bg-emerald-500", dot: "bg-emerald-500" },
    { label: "Potential", count: mid, bar: "bg-amber-500", dot: "bg-amber-500" },
    { label: "Not Recommended", count: low, bar: "bg-red-500", dot: "bg-red-500" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <Hero
        eyebrow={hrd?.company_name ?? "HRD"}
        title="Rekrut kandidat terbaik, lebih cepat"
        subtitle="AI memeringkat setiap pelamar berdasarkan kompetensi. Identitas disamarkan sampai Anda memutuskan shortlist."
        action={
          <Link href="/hrd/jobs/new" className="btn-primary shrink-0">
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.25} />
            Buat lowongan
          </Link>
        }
      >
        <HeroStat label="Lowongan aktif" icon="briefcase">
          <CountUp value={openJobs} />
        </HeroStat>
        <HeroStat label="Total pelamar" icon="users">
          <CountUp value={total} />
        </HeroStat>
        <HeroStat label="Highly Recommended" icon="target">
          <CountUp value={high} />
        </HeroStat>
      </Hero>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card self-start overflow-x-auto">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-ink-900">Lowongan Anda</h2>
            <span className="chip">{myJobs.length} lowongan</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">Posisi</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Pelamar</th>
                <th className="px-5 py-3">Unggulan</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowsByJob.map(({ job, total: count, high: hi }) => {
                const meta = jobStatusMeta[job.status];
                return (
                  <tr key={job.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900">{job.title}</p>
                      <p className="text-xs text-slate-400">
                        {job.location} · {formatDate(job.created_at)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 tabular-nums text-slate-700">{count}</td>
                    <td className="px-5 py-4">
                      {hi > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-emerald-700">
                          <Icon name="zap" className="h-3 w-3" />
                          {hi}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {job.status === "flagged" ? (
                        <span className="text-xs text-slate-400">Tidak diterbitkan</span>
                      ) : (
                        <Link
                          href={`/hrd/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-brand-600 hover:underline"
                        >
                          Lihat kandidat
                          <Icon name="arrowRight" className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <aside className="space-y-4">
          <AiInsight title="AI Insight">
            {topJob && topJob.high > 0 ? (
              <>
                <b className="text-ink-900">{topJob.job.title}</b> punya{" "}
                {topJob.high} kandidat Highly Recommended. Mulai tinjau dari peringkat
                teratas untuk memangkas waktu seleksi.
              </>
            ) : (
              "Belum ada kandidat unggulan. Insight akan muncul setelah ada pelamar."
            )}
          </AiInsight>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900">Distribusi kandidat</h2>
            <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
              {distribution.map((d) => (
                <div
                  key={d.label}
                  className={d.bar}
                  style={{ width: `${pct(d.count)}%` }}
                />
              ))}
            </div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {distribution.map((d) => (
                <li key={d.label} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <span className={`h-2 w-2 rounded-full ${d.dot}`} />
                    {d.label}
                  </span>
                  <span className="font-semibold tabular-nums text-ink-900">
                    {d.count}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
