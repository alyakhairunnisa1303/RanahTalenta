"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Check, Clock3, ExternalLink, Video } from "lucide-react";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import { useCurrentUser } from "../../../src/lib/use-current-user";
import type { ApplicantRow } from "../../../src/types/hirematch";

type Interview = {
  id: number; application_id: number; scheduled_at: string; meeting_url: string;
  notes: string; status: "scheduled" | "completed" | "cancelled";
  candidate_response: "pending" | "confirmed" | "reschedule_requested";
  reschedule_message: string; reschedule_requested_at: string | null;
  job_id: number; job_title: string; candidate_name: string;
  candidate_email: string | null; candidate_phone: string | null; portfolio_url: string | null;
};

export default function HrdInterviewsPage() {
  const jobs = useAllJobs();
  const { user } = useCurrentUser();
  const [shortlisted, setShortlisted] = useState<ApplicantRow[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<number | null>(null);
  const [dates, setDates] = useState<Record<number, string>>({});
  const [links, setLinks] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const mine = useMemo(() => jobs.filter((job) => job.hrd_id === user?.id), [jobs, user?.id]);

  async function reload() {
    const result = await fetch("/api/hrd/interviews", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { interviews?: Interview[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Jadwal gagal dimuat.");
      return data.interviews ?? [];
    });
    setInterviews(result);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      Promise.all(mine.map(async (job) => {
        const response = await fetch(`/api/jobs/${job.id}/applications`, { cache: "no-store" });
        const data = await response.json() as { applicants?: ApplicantRow[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Kandidat gagal dimuat.");
        return data.applicants ?? [];
      })),
      fetch("/api/hrd/interviews", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { interviews?: Interview[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Jadwal gagal dimuat.");
        return data.interviews ?? [];
      }),
    ]).then(([groups, schedules]) => {
      if (!cancelled) {
        setShortlisted(groups.flat().filter((row) => row.application.status === "shortlisted"));
        setInterviews(schedules);
      }
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Jadwal gagal dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mine, user]);

  async function schedule(applicationId: number) {
    const date = dates[applicationId];
    if (!date) { setError("Pilih tanggal dan waktu interview terlebih dahulu."); return; }
    setSaving(applicationId); setError("");
    try {
      const response = await fetch("/api/hrd/interviews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId, scheduled_at: new Date(date).toISOString(), meeting_url: links[applicationId] ?? "", notes: notes[applicationId] ?? "" }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Jadwal gagal disimpan.");
      await reload();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Jadwal gagal disimpan."); }
    finally { setSaving(null); }
  }

  async function setStatus(id: number, status: Interview["status"]) {
    setError("");
    const response = await fetch("/api/hrd/interviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) { setError(data.error ?? "Status jadwal gagal diperbarui."); return; }
    setInterviews((current) => current.map((item) => item.id === id ? { ...item, status } : item));
  }

  const scheduledApplicationIds = new Set(interviews.map((item) => item.application_id));
  const unscheduled = shortlisted.filter((row) => !scheduledApplicationIds.has(row.application.id));
  const sortedInterviews = [...interviews].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 sm:px-8">
      <header>
        <p className="eyebrow">Rekrutmen</p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Jadwal Interview</h1>
        <p className="mt-1 text-sm text-slate-500">Atur jadwal untuk kandidat yang sudah masuk shortlist.</p>
      </header>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <section className="space-y-3">
        <h2 className="font-semibold text-ink-900">Perlu dijadwalkan <span className="chip ml-2">{unscheduled.length}</span></h2>
        {loading ? <div className="card p-8 text-center text-sm text-slate-500">Memuat kandidat…</div> : unscheduled.length ? unscheduled.map((row) => {
          const job = mine.find((item) => item.id === row.application.job_id);
          const id = row.application.id;
          return <article key={id} className="card grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div><p className="font-semibold text-ink-900">{row.candidate.name}</p><p className="mt-1 text-sm text-slate-500">{job?.title ?? "Lowongan"} · Skor AI {row.match.match_score}%</p></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="label">Tanggal dan waktu<input className="input mt-1" type="datetime-local" value={dates[id] ?? ""} onChange={(event) => setDates((current) => ({ ...current, [id]: event.target.value }))} /></label>
              <label className="label">Tautan meeting (opsional)<input className="input mt-1" type="url" placeholder="https://…" value={links[id] ?? ""} onChange={(event) => setLinks((current) => ({ ...current, [id]: event.target.value }))} /></label>
              <label className="label sm:col-span-2">Catatan<input className="input mt-1" placeholder="Agenda atau instruksi untuk kandidat" value={notes[id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [id]: event.target.value }))} /></label>
            </div>
            <button disabled={saving === id} onClick={() => void schedule(id)} className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"><CalendarCheck className="h-4 w-4" />{saving === id ? "Menyimpan…" : "Jadwalkan"}</button>
          </article>;
        }) : <div className="card p-8 text-center text-sm text-slate-500">Belum ada kandidat shortlist yang menunggu jadwal interview.</div>}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-ink-900">Agenda interview <span className="chip ml-2">{interviews.length}</span></h2>
        {sortedInterviews.length ? <ul className="card divide-y divide-slate-100">
          {sortedInterviews.map((item) => {
            const portfolioHref = item.portfolio_url
              ? /^https?:\/\//i.test(item.portfolio_url) ? item.portfolio_url : `https://${item.portfolio_url}`
              : null;
            return <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{item.candidate_name} <span className="font-normal text-slate-500">· {item.job_title}</span></p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><Clock3 className="h-4 w-4" />{new Date(item.scheduled_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })} · {item.status === "scheduled" ? "Terjadwal" : item.status === "completed" ? "Selesai" : "Dibatalkan"}</p>
              {(item.candidate_email || item.candidate_phone || portfolioHref) && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                {item.candidate_email && <a href={`mailto:${item.candidate_email}`} className="hover:text-brand-700 hover:underline">{item.candidate_email}</a>}
                {item.candidate_phone && <a href={`tel:${item.candidate_phone}`} className="hover:text-brand-700 hover:underline">{item.candidate_phone}</a>}
                {portfolioHref && <a href={portfolioHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Portofolio<ExternalLink className="h-3 w-3" /></a>}
              </div>}
              {item.notes && <p className="mt-1 text-sm text-slate-500">{item.notes}</p>}
              {item.status === "scheduled" && <p className={`mt-2 text-xs font-semibold ${item.candidate_response === "confirmed" ? "text-emerald-700" : item.candidate_response === "reschedule_requested" ? "text-amber-700" : "text-slate-500"}`}>{item.candidate_response === "confirmed" ? "Pelamar mengonfirmasi kehadiran" : item.candidate_response === "reschedule_requested" ? "Pelamar meminta jadwal ulang" : "Menunggu respons pelamar"}</p>}
              {item.candidate_response === "reschedule_requested" && item.reschedule_message && <p className="mt-1 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Pesan pelamar: {item.reschedule_message}</p>}
            </div>
            <div className="flex items-center gap-2">
              {item.meeting_url && <a href={item.meeting_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"><Video className="h-4 w-4" />Meeting<ExternalLink className="h-3 w-3" /></a>}
              {item.status === "scheduled" && <><button onClick={() => void setStatus(item.id, "completed")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><Check className="h-4 w-4" />Selesai</button><button onClick={() => void setStatus(item.id, "cancelled")} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">Batalkan</button></>}
            </div>
          </li>;
          })}
        </ul> : <div className="card p-8 text-center text-sm text-slate-500">Belum ada agenda. Jadwalkan interview dari daftar shortlist.</div>}
      </section>
    </div>
  );
}
