"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, RefreshCw, Users } from "lucide-react";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import { useCurrentUser } from "../../../src/lib/use-current-user";
import { notifyDataChanged } from "../../../src/lib/client-events";
import type { ApplicantRow, ApplicationStatus } from "../../../src/types/hirematch";

export default function HrdCandidatesPage() {
  const jobs = useAllJobs();
  const { user } = useCurrentUser();
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | ApplicationStatus>("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [reviewThreshold, setReviewThreshold] = useState(60);
  const mine = useMemo(() => jobs.filter((job) => job.hrd_id === user?.id), [jobs, user?.id]);

  useEffect(() => {
    if (!user || !jobs.length) return;
    let cancelled = false;
    Promise.all(mine.map(async (job) => {
      const response = await fetch(`/api/jobs/${job.id}/applications`, { cache: "no-store" });
      const result = await response.json() as { applicants?: ApplicantRow[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Daftar kandidat gagal dimuat.");
      return result.applicants ?? [];
    }))
      .then((groups) => { if (!cancelled) setRows(groups.flat().sort((a, b) => b.match.match_score - a.match.match_score)); })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Daftar kandidat gagal dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [jobs, mine, user]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hrd/ai-settings", { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json() as { settings?: { review_threshold: number } }).settings : null)
      .then((settings) => { if (!cancelled && settings) setReviewThreshold(settings.review_threshold); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const visible = rows.filter((row) => filter === "all" || row.application.status === filter);

  async function updateStatus(applicationId: number, status: ApplicationStatus) {
    setSavingId(applicationId);
    setError("");
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Status kandidat gagal diperbarui.");
      const target = rows.find((row) => row.application.id === applicationId);
      if (target) {
        const refreshed = await fetch(`/api/jobs/${target.application.job_id}/applications`, { cache: "no-store" });
        const data = await refreshed.json() as { applicants?: ApplicantRow[] };
        if (refreshed.ok && data.applicants) {
          setRows((current) => current.map((row) => data.applicants?.find((item) => item.application.id === row.application.id) ?? row));
        }
      }
      notifyDataChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Status kandidat gagal diperbarui."); }
    finally { setSavingId(null); }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
      <header>
        <p className="eyebrow">Rekrutmen</p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Kandidat / Talent Pool</h1>
        <p className="mt-1 text-sm text-slate-500">Tinjau skor screening AI dan kelola shortlist. Identitas tetap disamarkan sampai kandidat di-shortlist.</p>
      </header>
      <section className="card overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          {(["all", "pending", "shortlisted", "rejected"] as const).map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-ink-900 text-white" : "bg-slate-100 text-slate-600"}`}>
              {value === "all" ? `Semua (${rows.length})` : `${value === "pending" ? "Menunggu" : value === "shortlisted" ? "Shortlist" : "Ditolak"} (${rows.filter((row) => row.application.status === value).length})`}
            </button>
          ))}
        </div>
        {error && <p role="alert" className="m-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {loading && mine.length > 0 ? <div className="p-12 text-center text-sm text-slate-500">Memuat kandidat dan hasil screening…</div> : visible.length ? (
          <ul className="divide-y divide-slate-100">
            {visible.map(({ application, match, candidate }) => {
              const job = mine.find((item) => item.id === application.job_id);
              return <li key={application.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Users className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">{candidate.name}</p>
                    <p className="truncate text-sm text-slate-500">{job?.title ?? "Lowongan"} · {application.applied_at}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 pl-[52px] sm:pl-0">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${match.match_score >= reviewThreshold ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>AI {match.match_score}%{match.match_score >= reviewThreshold ? " · Rekomendasi" : ""}</span>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{application.status === "pending" ? "Menunggu" : application.status === "shortlisted" ? "Shortlist" : "Ditolak"}</span>
                  {job && <Link href={`/hrd/jobs/${job.id}`} title="Lihat detail kandidat" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye className="h-4 w-4" /></Link>}
                  {application.status !== "shortlisted" && <button disabled={savingId === application.id} onClick={() => void updateStatus(application.id, "shortlisted")} className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{savingId === application.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : "Shortlist"}</button>}
                  {application.status === "pending" && <button disabled={savingId === application.id} onClick={() => void updateStatus(application.id, "rejected")} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-50">Tolak</button>}
                </div>
              </li>;
            })}
          </ul>
        ) : <div className="px-6 py-14 text-center text-sm text-slate-500">{rows.length ? "Tidak ada kandidat pada filter ini." : "Belum ada lamaran. Kandidat yang melamar akan tampil bersama skor AI di sini."}</div>}
      </section>
    </div>
  );
}
