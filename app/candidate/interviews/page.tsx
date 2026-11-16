"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, MapPin, RefreshCw, Video } from "lucide-react";

type CandidateResponse = "pending" | "confirmed" | "reschedule_requested";
type Interview = {
  id: number;
  scheduled_at: string;
  meeting_url: string;
  notes: string;
  status: "scheduled" | "completed" | "cancelled";
  candidate_response: CandidateResponse;
  reschedule_message: string;
  reschedule_requested_at: string | null;
  job_title: string;
  company_name: string;
};

export default function CandidateInterviewsPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);
  const [rescheduleMessage, setRescheduleMessage] = useState("");

  const loadInterviews = useCallback(async () => {
    const response = await fetch("/api/candidate/interviews", { cache: "no-store" });
    const data = await response.json() as { interviews?: Interview[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Jadwal wawancara gagal dimuat.");
    setInterviews(data.interviews ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/candidate/interviews", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { interviews?: Interview[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Jadwal wawancara gagal dimuat.");
        if (!cancelled) setInterviews(data.interviews ?? []);
      })
      .catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Jadwal wawancara gagal dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const upcoming = interviews.filter((item) => item.status === "scheduled").sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const past = interviews.filter((item) => item.status !== "scheduled");

  async function respond(id: number, action: "confirm" | "reschedule", message = "") {
    setSavingId(id);
    setError("");
    try {
      const response = await fetch("/api/candidate/interviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action, ...(action === "reschedule" ? { message } : {}) }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Respons wawancara gagal disimpan.");
      await loadInterviews();
      setRescheduleId(null);
      setRescheduleMessage("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Respons wawancara gagal disimpan.");
    } finally {
      setSavingId(null);
    }
  }

  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
    <header><p className="eyebrow">Aktivitas Pelamar</p><h1 className="mt-2 text-2xl font-bold text-ink-900">Jadwal Wawancara</h1><p className="mt-1 text-sm text-slate-500">Undangan, detail jadwal, dan respons Anda kepada perusahaan.</p></header>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="space-y-3"><h2 className="font-semibold text-ink-900">Akan datang</h2>
      {loading ? <div className="card p-8 text-center text-sm text-slate-500">Memuat jadwal…</div> : upcoming.length ? upcoming.map((item) => <article key={item.id} className="card flex flex-col gap-5 p-5">
        <div className="min-w-0"><span className="chip bg-emerald-50 text-emerald-700">Undangan aktif</span><p className="mt-3 text-lg font-semibold text-ink-900">{item.job_title}</p><p className="text-sm text-slate-500">{item.company_name}</p><p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4 text-brand-600" />{new Date(item.scheduled_at).toLocaleDateString("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" })}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Clock3 className="h-4 w-4 text-brand-600" />{new Date(item.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" })} WIB</p><p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-700">{item.meeting_url ? <><Video className="h-4 w-4" />Wawancara Online</> : <><MapPin className="h-4 w-4" />Wawancara Offline</>}</p>{item.meeting_url && <a href={item.meeting_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><Video className="h-4 w-4" />Buka tautan meeting</a>}{item.notes && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{item.notes}</p>}
          {item.candidate_response === "confirmed" && <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Kehadiran telah dikonfirmasi</p>}
          {item.candidate_response === "reschedule_requested" && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Permintaan jadwal ulang sudah dikirim. Pesan: {item.reschedule_message}</p>}
        </div>
        {item.candidate_response === "pending" && <div className="flex shrink-0 flex-col gap-2 sm:min-w-48"><button disabled={savingId === item.id} onClick={() => void respond(item.id, "confirm")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{savingId === item.id ? "Menyimpan…" : "Konfirmasi Hadir"}</button><button disabled={savingId === item.id} onClick={() => { setRescheduleId(item.id); setRescheduleMessage(""); }} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Minta Jadwal Ulang</button></div>}
        {rescheduleId === item.id && item.candidate_response === "pending" && <form className="w-full space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4" onSubmit={(event) => { event.preventDefault(); void respond(item.id, "reschedule", rescheduleMessage); }}><label className="label" htmlFor={`reschedule-message-${item.id}`}>Alasan atau waktu alternatif<textarea id={`reschedule-message-${item.id}`} required minLength={5} maxLength={1000} className="input mt-1 min-h-24 w-full" value={rescheduleMessage} onChange={(event) => setRescheduleMessage(event.target.value)} placeholder="Tuliskan waktu yang Anda usulkan atau alasan permintaan." /></label><div className="flex gap-2"><button disabled={savingId === item.id} className="btn-primary btn-sm" type="submit">{savingId === item.id ? "Mengirim…" : "Kirim permintaan"}</button><button className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white" type="button" onClick={() => setRescheduleId(null)}>Batal</button></div></form>}
      </article>) : <div className="card p-8 text-center text-sm text-slate-500">Belum ada jadwal wawancara. Jika perusahaan mengundang Anda, detail jadwal akan muncul di sini.</div>}
    </section>
    {past.length > 0 && <section className="space-y-3"><h2 className="font-semibold text-ink-900">Riwayat</h2><div className="card divide-y divide-slate-100">{past.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-medium text-ink-900">{item.job_title} · {item.company_name}</p><p className="text-xs text-slate-500">{new Date(item.scheduled_at).toLocaleString("id-ID")}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{item.status === "completed" ? "Selesai" : "Dibatalkan"}</span></div>)}</div></section>}
    <Link href="/candidate/dashboard" className="inline-flex text-sm font-semibold text-brand-700 hover:underline">Kembali ke dashboard</Link>
  </div>;
}
