"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, FileCheck2, Sparkles, UploadCloud, CircleAlert, Trash2 } from "lucide-react";
import { AiInsight } from "../../../src/components/AiUi";
import { ScoreRing } from "../../../src/components/ScoreBadge";
import { useCurrentUser } from "../../../src/lib/use-current-user";
import {
  ScreenApiError,
  screenCvFileWithJobs,
  screenCvWithJobs,
  toJobMatch,
} from "../../../src/lib/screen-client";
import type { Job, JobMatch } from "../../../src/types/hirematch";

const STAGES = [
  "Mengekstrak teks dari dokumen",
  "AI memeriksa keaslian CV",
  "AI menyamarkan data pribadi",
  "AI mencocokkan skill dengan lowongan",
];
const MIN_PROGRESS_DURATION_MS = 3200;

type AnalysisCache = {
  cvText: string;
  matches: JobMatch[];
  auditMode: string | null;
  analyzed: boolean;
};

export default function CandidateCvProfilePage() {
  const { user } = useCurrentUser();
  const candidateId = user?.id ?? 0;
  const [cvText, setCvText] = useState<string | null>(null);
  const [cvLoaded, setCvLoaded] = useState(false);
  const [openJobs, setOpenJobs] = useState<Job[]>([]);
  const [jobsLoaded, setJobsLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [analysisError, setAnalysisError] = useState("");
  const [deletingCv, setDeletingCv] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");
  const [stage, setStage] = useState(-1);
  const [fileName, setFileName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [auditMode, setAuditMode] = useState<string | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const autoAnalyzedText = useRef<string | null>(null);
  const cacheKey = useMemo(() => `ranah-talenta:cv-analysis:${candidateId}`, [candidateId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/candidate/cv", { cache: "no-store" }).then(async (response) => {
        if (response.status === 404) return "";
        const data = await response.json() as { cv_text?: string; error?: string };
        if (!response.ok) throw new Error(data.error ?? "CV gagal dimuat.");
        return data.cv_text ?? "";
      }),
      fetch("/api/jobs", { cache: "no-store" }).then(async (response) => {
        const data = await response.json() as { jobs?: Job[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Daftar lowongan gagal dimuat.");
        return data.jobs ?? [];
      }),
    ]).then(([savedCv, jobs]) => {
      if (cancelled) return;
      setCvText(savedCv);
      setOpenJobs(jobs.filter((job) => job.status === "open"));
    }).catch((reason: unknown) => {
      if (!cancelled) setLoadError(reason instanceof Error ? reason.message : "Data CV gagal dimuat.");
    }).finally(() => {
      if (!cancelled) {
        setCvLoaded(true);
        setJobsLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const analyzeCv = useCallback(async (options: { file?: File; text?: string; name: string }) => {
    if (!candidateId) return;
    setAnalysisError("");
    setFileName(options.name);
    setAnalyzed(false);
    setAnalyzing(true);
    setMatches([]);
    setAuditMode(null);
    setStage(0);
    const progressStartedAt = Date.now();
    try { window.sessionStorage.removeItem(cacheKey); } catch { /* Cache hanya membantu dashboard; analisis tetap berjalan. */ }

    const timer = window.setInterval(() => {
      setStage((current) => Math.min(current + 1, STAGES.length - 1));
    }, 900);

    try {
      const response = options.file
        ? await screenCvFileWithJobs(options.file, openJobs)
        : await screenCvWithJobs(options.text ?? "", openJobs);

      if (response.status === "rejected") {
        throw new Error(response.validation.reject_reason ?? "Dokumen ini tidak terdeteksi sebagai CV yang sah.");
      }

      const redactedCv = response.validation.redacted_cv;
      const saveResponse = await fetch("/api/candidate/cv", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: redactedCv }),
      });
      if (!saveResponse.ok) throw new Error("CV telah dianalisis, tetapi gagal disimpan ke profil Anda.");

      const nextMatches = response.status === "ranked"
        ? response.results.map((result) => toJobMatch(Number(result.job.id), candidateId, result.match))
        : response.status === "scored" && openJobs[0]
          ? [toJobMatch(openJobs[0].id, candidateId, response.match)]
          : [];
      const nextAuditMode = response.audit.mode;
      const cache: AnalysisCache = { cvText: redactedCv, matches: nextMatches, auditMode: nextAuditMode, analyzed: true };
      try { window.sessionStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* Hasil tetap tampil meski cache browser penuh/nonaktif. */ }

      const remainingProgress = MIN_PROGRESS_DURATION_MS - (Date.now() - progressStartedAt);
      if (remainingProgress > 0) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remainingProgress));
      }
      autoAnalyzedText.current = redactedCv;
      setCvText(redactedCv);
      setMatches(nextMatches);
      setAuditMode(nextAuditMode);
      setAnalyzed(true);
      setStage(STAGES.length);
    } catch (reason: unknown) {
      setAnalysisError(
        reason instanceof ScreenApiError && reason.issues.length
          ? `${reason.message} ${reason.issues.join("; ")}`
          : reason instanceof Error ? reason.message : "Analisis CV gagal diproses.",
      );
      setStage(-1);
    } finally {
      window.clearInterval(timer);
      setAnalyzing(false);
    }
  }, [cacheKey, candidateId, openJobs]);

  useEffect(() => {
    if (!cvLoaded || !jobsLoaded || !candidateId || !cvText || autoAnalyzedText.current === cvText) return;
    const timer = window.setTimeout(() => {
      autoAnalyzedText.current = cvText;
      setFileName("CV tersimpan");
      try {
        const cached = window.sessionStorage.getItem(cacheKey);
        const result = cached ? JSON.parse(cached) as AnalysisCache : null;
        if (result?.cvText === cvText && result.analyzed && Array.isArray(result.matches)) {
          setMatches(result.matches);
          setAuditMode(result.auditMode ?? null);
          setAnalyzed(true);
          setStage(STAGES.length);
          return;
        }
      } catch { /* Jika cache rusak, analisis ulang CV tersimpan. */ }
      void analyzeCv({ text: cvText, name: "CV tersimpan" });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [analyzeCv, cacheKey, candidateId, cvLoaded, cvText, jobsLoaded]);

  async function handleFile(file?: File) {
    if (!file) return;
    if (!/\.(pdf|docx|txt)$/i.test(file.name) && !["application/pdf", "text/plain"].includes(file.type)) {
      setAnalysisError("File harus berformat PDF, DOCX, atau TXT.");
      return;
    }
    autoAnalyzedText.current = null;
    await analyzeCv({ file, name: file.name });
  }

  async function deleteSavedCv() {
    if (!candidateId || analyzing || deletingCv || !window.confirm("Hapus CV tersimpan dan seluruh skor, bukti, serta umpan balik screening AI? Riwayat lamaran tetap ada dan perlu discreen ulang setelah Anda mengunggah CV lagi.")) return;
    setDeletingCv(true);
    setDeleteError("");
    setDeleteSuccess("");
    try {
      const response = await fetch("/api/candidate/cv", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "CV gagal dihapus.");
      try { window.sessionStorage.removeItem(cacheKey); } catch { /* Hasil sesi dibersihkan saat cache tersedia. */ }
      autoAnalyzedText.current = null;
      setCvText("");
      setMatches([]);
      setAnalyzed(false);
      setAuditMode(null);
      setStage(-1);
      setFileName("");
      setDeleteSuccess("CV tersimpan dan hasil screening AI sudah dihapus. Riwayat lamaran tetap tersimpan.");
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : "CV gagal dihapus.");
    } finally {
      setDeletingCv(false);
    }
  }

  const rankedMatches = matches
    .filter((match) => openJobs.some((job) => job.id === match.job_id))
    .sort((a, b) => b.match_score - a.match_score);
  const processing = analyzing && stage >= 0;
  const showAnalysisProgress = processing || analyzed;

  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
    <header><p className="eyebrow">Profil Pelamar</p><h1 className="mt-2 text-2xl font-bold text-ink-900">CV & Analisis AI</h1><p className="mt-1 text-sm text-slate-500">Unggah CV, lihat tahap screening AI, lalu gunakan saran untuk memperkuat profil Anda.</p></header>
    {loadError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{loadError}</div>}

    <section className="card p-6">
      <div className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink-900">Smart CV Uploader</h2><p className="text-xs text-slate-500">PDF, DOCX, atau TXT · data pribadi disamarkan dalam proses screening</p></div></div>
      <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Teks CV tersimpan di profil Anda. Untuk analisis AI, sistem mengirimkan teks yang sudah disamarkan ke Gemini dan menyimpan hasil screening pada riwayat lamaran. Anda dapat menghapus CV tersimpan beserta hasil screening-nya dari bagian bawah halaman ini.</p>
      <label className={`mt-5 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-9 text-center transition ${analyzing ? "cursor-wait border-brand-300 bg-brand-50/40" : "cursor-pointer border-slate-300 bg-gradient-to-b from-slate-50 to-white hover:border-brand-500 hover:bg-brand-50/50"}`}>
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-lg shadow-brand-600/25"><UploadCloud className="h-6 w-6" /></span>
        <span className="mt-3 text-sm font-semibold text-ink-900">{analyzing ? `Sedang menganalisis ${fileName}…` : "Pilih atau jatuhkan CV untuk dianalisis"}</span>
        <span className="mt-1 text-xs text-slate-500">{cvText ? "Unggah berkas baru untuk mengganti CV tersimpan dan menjalankan analisis ulang." : "AI akan mengekstrak isi, menyamarkan identitas, dan memberi saran kecocokan."}</span>
        <input type="file" accept=".pdf,.docx,.txt,application/pdf,text/plain" className="sr-only" disabled={analyzing || !candidateId} onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </label>

      {analysisError && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{analysisError}</p>}
      {showAnalysisProgress && <div className={`mt-5 rounded-xl border p-4 transition-colors ${analyzed && !processing ? "border-emerald-200 bg-emerald-50/40" : "border-slate-100 bg-white"}`}>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-ink-900">{processing ? "Proses analisis AI" : "Checklist analisis AI"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${analyzed && !processing ? "bg-emerald-100 text-emerald-700" : "bg-brand-50 text-brand-700"}`}>{processing ? `Tahap ${Math.min(stage + 1, STAGES.length)} dari ${STAGES.length}` : "Selesai · 100%"}</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all duration-500 ${analyzed && !processing ? "bg-emerald-500" : "bg-gradient-to-r from-brand-600 via-sky-400 to-accent-400"}`} style={{ width: `${analyzed && !processing ? 100 : Math.min(((stage + 1) / STAGES.length) * 100, 100)}%` }} /></div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-2">{STAGES.map((label, index) => {
          const completed = analyzed && !processing || index < stage;
          const active = processing && index === stage;
          return <li key={label} className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${completed ? "bg-emerald-50/80" : active ? "bg-brand-50" : "bg-slate-50"}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${completed ? "bg-emerald-500 text-white" : active ? "animate-pulse bg-brand-600 text-white" : "bg-slate-200 text-slate-500"}`}>{completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}</span><span className={completed ? "font-medium text-emerald-800" : active ? "font-semibold text-brand-800" : "text-slate-500"}>{label}</span></li>;
        })}</ol>
      </div>}
      {analyzed && !analyzing && <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800"><Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} /><span><b>CV berhasil dianalisis oleh pipeline AI.</b>{auditMode ? ` Mode analisis: ${auditMode}.` : ""} {openJobs.length ? `${rankedMatches.length} hasil kecocokan tersedia di bawah.` : "CV tervalidasi dan tersimpan; hasil kecocokan muncul saat ada lowongan aktif."}</span></div>}
    </section>

    {analyzed && rankedMatches.length > 0 && <section className="space-y-3">
      <div><p className="eyebrow">Umpan Balik AI</p><h2 className="mt-1 text-xl font-bold text-ink-900">Saran untuk memperkuat CV Anda</h2><p className="mt-1 text-sm text-slate-500">Masukan berikut disusun berdasarkan kebutuhan lowongan aktif dan isi CV yang sudah disamarkan.</p></div>
      {rankedMatches.map((match, index) => {
        const job = openJobs.find((item) => item.id === match.job_id);
        if (!job) return null;
        return <article key={match.id} className="card space-y-4 p-5">
          <div className="flex items-center gap-4"><ScoreRing score={match.match_score} size={58} /><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{index === 0 ? "Kecocokan tertinggi" : "Kecocokan lowongan"}</p><h3 className="font-semibold text-ink-900">{job.title}</h3><p className="text-sm text-slate-500">Skor kecocokan {match.match_score}%</p></div><Link href={`/candidate/jobs/${job.id}`} className="ml-auto hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:underline sm:inline-flex">Detail lowongan<ArrowUpRight className="h-4 w-4" /></Link></div>
          <AiInsight title="Umpan balik AI untuk CV">{match.candidate_feedback}</AiInsight>
          <div className="grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-700">Kekuatan yang terdeteksi</p><div className="flex flex-wrap gap-2">{match.hr_strengths.length ? match.hr_strengths.map((skill) => <span key={skill} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{skill}</span>) : <span className="text-sm text-slate-500">Belum ada kekuatan spesifik yang terdeteksi.</span>}</div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">Skill yang bisa ditambahkan</p><div className="flex flex-wrap gap-2">{match.hr_gaps.length ? match.hr_gaps.map((skill) => <span key={skill} className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{skill}</span>) : <span className="text-sm text-slate-500">Tidak ada gap skill utama untuk lowongan ini.</span>}</div></div></div>
          <Link href={`/candidate/jobs/${job.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline sm:hidden">Detail lowongan<ArrowUpRight className="h-4 w-4" /></Link>
        </article>;
      })}
    </section>}

    {analyzed && rankedMatches.length === 0 && <section className="card p-5"><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-ink-900">CV tersimpan dan tervalidasi</h2></div><p className="mt-2 text-sm text-slate-500">Belum ada hasil pencocokan. Rekomendasi dan masukan berbasis lowongan akan tampil setelah tersedia lowongan aktif.</p></section>}

    {cvLoaded && cvText && <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-2"><FileCheck2 className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-ink-900">CV tersimpan (data sudah disamarkan)</h2></div><span className="text-xs text-slate-500">{cvText.trim().split(/\s+/).filter(Boolean).length} kata</span></div>
      <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-700">{cvText}</pre>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
        <div className="min-w-0 flex-1">{deleteError && <p role="alert" className="text-sm text-rose-700">{deleteError}</p>}{deleteSuccess && <p role="status" className="text-sm text-emerald-700">{deleteSuccess}</p>}</div>
        <button type="button" onClick={() => void deleteSavedCv()} disabled={deletingCv || analyzing} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 className="h-4 w-4" />{deletingCv ? "Menghapus…" : "Hapus CV dan hasil screening"}
        </button>
      </div>
    </section>}
    {cvLoaded && !cvText && <div className="space-y-2 text-center"><p className="text-sm text-slate-500">Belum ada CV tersimpan. Unggah CV di atas untuk memulai analisis.</p>{deleteSuccess && <p role="status" className="text-sm text-emerald-700">{deleteSuccess}</p>}</div>}
    <div className="flex justify-end"><Link href="/candidate/dashboard" className="text-sm font-semibold text-brand-700 hover:underline">Kembali ke dashboard →</Link></div>
  </div>;
}
