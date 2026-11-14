"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, FileCheck2 } from "lucide-react";
import { CompanyAvatar } from "../../../src/components/JobCard";
import { applicationStatusMeta } from "../../../src/data/mockData";
import { formatDate } from "../../../src/lib/format";
import { DATA_CHANGED_EVENT } from "../../../src/lib/client-events";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import { useCurrentUser } from "../../../src/lib/use-current-user";
import type { Application } from "../../../src/types/hirematch";

export default function CandidateApplicationsPage() {
  const { user } = useCurrentUser();
  const jobs = useAllJobs();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/applications", { cache: "no-store" });
        const data = await response.json() as { applications?: Application[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Daftar lamaran gagal dimuat.");
        if (!cancelled) {
          setApplications((data.applications ?? []).filter((application) => application.candidate_id === user?.id));
          setError("");
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Daftar lamaran gagal dimuat.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(DATA_CHANGED_EVENT, load);
    };
  }, [user?.id]);

  const sortedApplications = useMemo(
    () => [...applications].sort((a, b) => b.applied_at.localeCompare(a.applied_at)),
    [applications],
  );
  const counts = useMemo(() => ({
    total: applications.length,
    reviewing: applications.filter((application) => application.status === "pending").length,
    shortlisted: applications.filter((application) => application.status === "shortlisted").length,
    rejected: applications.filter((application) => application.status === "rejected").length,
  }), [applications]);

  return <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-8">
    <header>
      <p className="eyebrow">Karir & Lamaran</p>
      <h1 className="mt-2 text-2xl font-bold text-ink-900">Lamaran Saya</h1>
      <p className="mt-1 text-sm text-slate-500">Pantau semua lamaran dan perkembangan proses seleksi Anda.</p>
    </header>

    <section className="grid gap-3 sm:grid-cols-3">
      <div className="card flex items-center gap-3 p-4"><span className="rounded-lg bg-brand-50 p-2 text-brand-700"><FileCheck2 className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Total lamaran</p><p className="text-xl font-bold text-ink-900">{counts.total}</p></div></div>
      <div className="card flex items-center gap-3 p-4"><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><BriefcaseBusiness className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Menunggu review</p><p className="text-xl font-bold text-ink-900">{counts.reviewing}</p></div></div>
      <div className="card flex items-center gap-3 p-4"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><ArrowUpRight className="h-5 w-5" /></span><div><p className="text-xs text-slate-500">Masuk shortlist</p><p className="text-xl font-bold text-ink-900">{counts.shortlisted}</p></div></div>
    </section>

    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-ink-900">Riwayat lamaran</h2><span className="chip">{counts.total} lamaran</span></div>
      {loading ? <div className="card p-10 text-center text-sm text-slate-500">Memuat lamaran…</div> : sortedApplications.length === 0 ? <div className="card px-6 py-14 text-center"><BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-semibold text-ink-900">Belum ada lamaran</p><p className="mt-1 text-sm text-slate-500">Cari lowongan yang sesuai, lalu lacak statusnya di halaman ini.</p><Link href="/candidate/jobs" className="btn-primary mt-4 inline-flex items-center gap-2">Cari lowongan<ArrowUpRight className="h-4 w-4" /></Link></div> : sortedApplications.map((application) => {
        const job = jobs.find((item) => item.id === application.job_id);
        const companyName = job?.company_name ?? "Perusahaan";
        const meta = applicationStatusMeta[application.status];
        return <article key={application.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <CompanyAvatar name={companyName} />
          <div className="min-w-0 flex-1">
            <Link href={`/candidate/jobs/${application.job_id}`} className="font-semibold text-ink-900 hover:text-brand-700">{job?.title ?? "Lowongan"}</Link>
            <p className="mt-0.5 text-sm text-slate-500">{companyName}{job?.location ? ` · ${job.location}` : ""}</p>
            <p className="mt-1 text-xs text-slate-400">Dilamar {formatDate(application.applied_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
            {application.match_score !== undefined && <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Skor AI {application.match_score}%</span>}
            {application.status === "shortlisted" && <Link href="/candidate/interviews" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">Lihat jadwal →</Link>}
          </div>
        </article>;
      })}
    </section>
    <div className="flex justify-end"><Link href="/candidate/dashboard" className="text-sm font-semibold text-brand-700 hover:underline">Kembali ke dashboard →</Link></div>
  </div>;
}
