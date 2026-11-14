"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScoreBadge, {
  ScoreRing,
  scoreMeta,
} from "@/src/components/ScoreBadge";
import Icon from "@/src/components/Icons";
import {
  AiInsight,
  CountUp,
  Hero,
  HeroStat,
} from "@/src/components/AiUi";
import { splitLines } from "@/src/lib/format";
import { notifyDataChanged } from "@/src/lib/client-events";
import {
  localDateTimeMinimum,
  saveInterviewSchedule,
  validateInterviewSchedule,
  type InterviewScheduleInput,
  type InterviewScheduleRecord,
} from "@/src/lib/interview-scheduling";
import type {
  ApplicantRow,
  ApplicationStatus,
  Job,
} from "@/src/types/hirematch";
import type { ApplicationDocumentRecord } from "@/src/lib/application-documents";

export default function HrdJobDetailClient({ jobId }: { jobId: number }) {
  const [job, setJob] = useState<Job | null>(null);
  const [jobLoaded, setJobLoaded] = useState(false);
  const [rows, setRows] = useState<ApplicantRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [scoring, setScoring] = useState(true);
  const [scoringError, setScoringError] = useState("");
  const [startingScreening, setStartingScreening] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState<{ done: number; total: number } | null>(null);
  const [applicationDocument, setApplicationDocument] = useState<ApplicationDocumentRecord | null>(null);
  const [documentResolvedFor, setDocumentResolvedFor] = useState<number | null>(null);
  const [interviewSchedules, setInterviewSchedules] = useState<InterviewScheduleRecord[]>([]);
  const [interviewsLoading, setInterviewsLoading] = useState(true);
  const [interviewsError, setInterviewsError] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleMeetingUrl, setScheduleMeetingUrl] = useState("");
  const [scheduleNotes, setScheduleNotes] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [minScheduleDate, setMinScheduleDate] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/jobs/${jobId}`, { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json() as { job: Job }).job : null)
      .then((record) => { if (!cancelled) setJob(record); })
      .catch(() => { if (!cancelled) setJob(null); })
      .finally(() => { if (!cancelled) setJobLoaded(true); });
    return () => { cancelled = true; };
  }, [jobId]);

  useEffect(() => {
    if (selectedId === null) return;

    let cancelled = false;
    fetch(`/api/applications/${selectedId}/document`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as ApplicationDocumentRecord;
      })
      .then((record) => {
        const application = rows.find((row) => row.application.id === selectedId)?.application;
        if (!cancelled) {
          setApplicationDocument(
            record &&
              application &&
              record.candidate_id === application.candidate_id &&
              record.job_id === application.job_id
              ? record
              : null,
          );
          setDocumentResolvedFor(selectedId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApplicationDocument(null);
          setDocumentResolvedFor(selectedId);
        }
      })

    return () => {
      cancelled = true;
    };
  }, [selectedId, rows]);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    fetch(`/api/jobs/${job.id}/applications`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { applicants?: ApplicantRow[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Pelamar gagal dimuat.");
        return result.applicants ?? [];
      })
      .then((applicants) => { if (!cancelled) setRows(applicants); })
      .catch((error: unknown) => { if (!cancelled) setScoringError(error instanceof Error ? error.message : "Pelamar gagal dimuat."); })
      .finally(() => { if (!cancelled) setScoring(false); });
    return () => { cancelled = true; };
  }, [job]);

  useEffect(() => {
    let cancelled = false;
    setInterviewsLoading(true);
    setInterviewsError("");
    fetch("/api/hrd/interviews", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { interviews?: InterviewScheduleRecord[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Jadwal wawancara gagal dimuat.");
        return data.interviews ?? [];
      })
      .then((items) => { if (!cancelled) setInterviewSchedules(items); })
      .catch((error: unknown) => {
        if (!cancelled) setInterviewsError(error instanceof Error ? error.message : "Jadwal wawancara gagal dimuat.");
      })
      .finally(() => { if (!cancelled) setInterviewsLoading(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  useEffect(() => {
    setScheduleDate("");
    setScheduleMeetingUrl("");
    setScheduleNotes("");
    setScheduleError("");
  }, [selectedId]);

  useEffect(() => {
    setMinScheduleDate(localDateTimeMinimum());
  }, []);

  if (!job) {
    if (!jobLoaded) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">Memuat lowongan...</div>;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">
        Lowongan tidak ditemukan.{" "}
        <Link href="/hrd/dashboard" className="font-semibold text-brand-600 underline">
          Kembali ke Dashboard HRD
        </Link>
      </div>
    );
  }

  const requirementsList = splitLines(job.requirements);

  const screeningStatus = (row: ApplicantRow) => row.application.screening_status ?? "completed";
  const isScreened = (row: ApplicantRow) => screeningStatus(row) === "completed";
  const screeningQueue = rows.filter((row) => ["not_started", "failed"].includes(screeningStatus(row)));
  const processingCount = rows.filter((row) => screeningStatus(row) === "processing").length;
  const screenedCount = rows.filter(isScreened).length;
  const sorted = [...rows].sort((a, b) => {
    const priority: Record<string, number> = { processing: 0, completed: 1, failed: 2, not_started: 3 };
    const stateOrder = priority[screeningStatus(a)] - priority[screeningStatus(b)];
    if (stateOrder !== 0) return stateOrder;
    if (isScreened(a) && isScreened(b)) return b.match.match_score - a.match.match_score;
    return b.application.applied_at.localeCompare(a.application.applied_at);
  });
  const selected = rows.find((r) => r.application.id === selectedId);
  const selectedInterview = interviewSchedules.find((item) => item.application_id === selectedId);

  // Kandidat yang direkomendasikan (Highly Recommended >= 80%)
  const recommendedCandidates = sorted.filter((r) => isScreened(r) && r.match.match_score >= 80);

  const high = recommendedCandidates.length;
  const mid = rows.filter(
    (r) => isScreened(r) && r.match.match_score >= 60 && r.match.match_score < 80
  ).length;
  const low = screenedCount - high - mid;

  async function startScreening() {
    const queue = rows.filter((row) => ["not_started", "failed"].includes(screeningStatus(row)));
    if (queue.length === 0 || startingScreening) return;

    setStartingScreening(true);
    setScoringError("");
    setScreeningProgress({ done: 0, total: queue.length });
    let failures = 0;

    for (let index = 0; index < queue.length; index += 1) {
      const applicant = queue[index];
      setRows((current) => current.map((row) => row.application.id === applicant.application.id
        ? { ...row, application: { ...row.application, screening_status: "processing", screening_error: null } }
        : row));

      let progressTimer: number | undefined;
      try {
        const pollProgress = async () => {
          try {
            const refreshed = await fetch(`/api/jobs/${jobId}/applications`, { cache: "no-store" });
            if (!refreshed.ok) return;
            const result = await refreshed.json() as { applicants?: ApplicantRow[] };
            const liveApplicant = result.applicants?.find((row) => row.application.id === applicant.application.id);
            if (liveApplicant) {
              setRows((current) => current.map((row) => row.application.id === applicant.application.id
                ? { ...row, application: { ...row.application, screening_step: liveApplicant.application.screening_step } }
                : row));
            }
          } catch {
            // Progres tetap diperbarui lagi pada polling berikutnya.
          }
        };
        progressTimer = window.setInterval(() => void pollProgress(), 500);
        const response = await fetch(`/api/applications/${applicant.application.id}/screen`, { method: "POST" });
        window.clearInterval(progressTimer);
        const result = await response.json().catch(() => null) as { error?: string } | null;
        if (response.status === 409) {
          let screeningFinished = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_000));
            const refreshed = await fetch(`/api/jobs/${jobId}/applications`, { cache: "no-store" });
            if (!refreshed.ok) continue;
            const latest = await refreshed.json() as { applicants?: ApplicantRow[] };
            if (latest.applicants) setRows(latest.applicants);
            const latestApplicant = latest.applicants?.find((row) => row.application.id === applicant.application.id);
            if (latestApplicant?.application.screening_status === "completed") {
              screeningFinished = true;
              break;
            }
            if (latestApplicant?.application.screening_status === "failed") {
              throw new Error(latestApplicant.application.screening_error ?? "Screening AI gagal dijalankan.");
            }
          }
          if (!screeningFinished) {
            setScoringError("Screening kandidat ini masih berjalan di server. Progresnya akan diperbarui otomatis.");
            continue;
          }
        }
        if (!response.ok && response.status !== 409) throw new Error(result?.error ?? "Screening AI gagal dijalankan.");
      } catch (error) {
        if (progressTimer !== undefined) window.clearInterval(progressTimer);
        failures += 1;
        const message = error instanceof Error ? error.message : "Screening AI gagal dijalankan.";
        setRows((current) => current.map((row) => row.application.id === applicant.application.id
          ? { ...row, application: { ...row.application, screening_status: "failed", screening_error: message } }
          : row));
      }

      try {
        const refreshed = await fetch(`/api/jobs/${jobId}/applications`, { cache: "no-store" });
        if (refreshed.ok) {
          const result = await refreshed.json() as { applicants?: ApplicantRow[] };
          if (result.applicants) setRows(result.applicants);
        }
      } catch {
        // Status lokal setiap kandidat tetap terlihat meski daftar gagal diperbarui.
      }
      setScreeningProgress({ done: index + 1, total: queue.length });
    }

    setStartingScreening(false);
    setScoringError(failures ? `${failures} pelamar gagal discreen. Anda dapat mencoba lagi.` : "");
    notifyDataChanged();
  }

  async function setStatus(applicationId: number, status: ApplicationStatus): Promise<boolean> {
    const target = rows.find((row) => row.application.id === applicationId);
    if (target && !isScreened(target)) {
      setScoringError("Selesaikan screening AI sebelum mengubah status pelamar.");
      return false;
    }
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        setScoringError("Status lamaran gagal diperbarui.");
        return false;
      }
      const refreshed = await fetch(`/api/jobs/${jobId}/applications`, { cache: "no-store" });
      if (!refreshed.ok) throw new Error("Daftar pelamar gagal diperbarui.");
      const result = await refreshed.json() as { applicants: ApplicantRow[] };
      setRows(result.applicants);
      notifyDataChanged();
      return true;
    } catch {
      setScoringError("Status lamaran gagal diperbarui.");
      return false;
    }
  }

  // Sistem Blind Screening Otomatis 100%:
  // Identitas HANYA terbuka secara otomatis ketika pelamar sudah diundang wawancara (shortlisted).
  // Tidak ada toggle/sakelar manual, sehingga seleksi awal murni tanpa bias.
  const isShortlisted = (r: ApplicantRow) => r.application.status === "shortlisted";
  const revealed = (r: ApplicantRow) => isShortlisted(r);

  async function inviteCandidate(applicationId: number) {
    const target = rows.find((r) => r.application.id === applicationId);
    const updated = await setStatus(applicationId, "shortlisted");
    if (target && updated) {
      setToast(
        `Sukses mengundang ${target.candidate.name}! Informasi detail pelamar dan kontak resmi kini otomatis terbuka.`
      );
      setTimeout(() => setToast(null), 5000);
    }
  }

  async function scheduleInterview() {
    if (!selected || savingSchedule) return;
    const applicationId = selected.application.id;
    const input: InterviewScheduleInput = {
      application_id: applicationId,
      date_time: scheduleDate,
      meeting_url: scheduleMeetingUrl.trim(),
      notes: scheduleNotes,
    };
    const validationError = validateInterviewSchedule(input);
    if (validationError) {
      setScheduleError(validationError);
      return;
    }

    setSavingSchedule(true);
    setScheduleError("");
    try {
      if (!isShortlisted(selected)) {
        const invited = await setStatus(applicationId, "shortlisted");
        if (!invited) {
          setScheduleError("Undangan wawancara gagal dibuat. Coba lagi.");
          return;
        }
      }

      const interview = await saveInterviewSchedule(input);
      setInterviewSchedules((current) => [
        ...current.filter((item) => item.application_id !== applicationId),
        interview,
      ]);
      notifyDataChanged();
      setToast("Jadwal wawancara berhasil dibuat.");
      setTimeout(() => setToast(null), 5000);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "Jadwal wawancara gagal disimpan.");
    } finally {
      setSavingSchedule(false);
    }
  }

  const displayName = (r: ApplicantRow) =>
    revealed(r)
      ? r.candidate.name
      : `Kandidat #${String(r.application.id).padStart(3, "0")}`;

  const Avatar = ({ r }: { r: ApplicantRow }) =>
    revealed(r) ? (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-sky-500 text-sm font-bold text-white shadow-sm">
        {r.candidate.name.charAt(0)}
      </span>
    ) : (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="eyeOff" className="h-4 w-4" />
      </span>
    );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1400px] space-y-6 px-4 py-8 sm:px-6 xl:px-8">
      {/* Toast Notifikasi Aksi */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 flex max-w-md animate-fade-in items-center gap-3 rounded-xl border-2 border-emerald-500 bg-white p-4 shadow-xl">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Icon name="check" className="h-4 w-4" strokeWidth={3} />
          </span>
          <p className="text-xs font-bold leading-relaxed text-ink-900">{toast}</p>
        </div>
      )}

      {/* Tombol Navigasi Kembali */}
      <Link
        href="/hrd/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-brand-600 transition"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Kembali ke Dashboard HRD
      </Link>

      {/* Hero Statistik Lowongan */}
      <Hero
        eyebrow="Peringkat kandidat AI — Portal HRD"
        title={job.title}
        subtitle={`${rows.length} pelamar terdaftar. ${screenedCount} sudah discreen dan diperingkat oleh AI.`}
      >
        <HeroStat label="Highly Recommended" icon="zap">
          <CountUp value={high} />
        </HeroStat>
        <HeroStat label="Potential" icon="trending">
          <CountUp value={mid} />
        </HeroStat>
        <HeroStat label="Not Recommended" icon="ban">
          <CountUp value={low} />
        </HeroStat>
      </Hero>

      {/* Grid 2 Kolom: Kolom Utama (Leaderboard) & Kolom Kanan (Sidebar Requirement & Recommended) */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* KOLOM KIRI: Leaderboard & Kontrol Blind Screening */}
        <div className="min-w-0 space-y-5">
          {/* Banner Sistem Blind Screening Otomatis (Tanpa Sakelar Manual) */}
          <div className="card flex w-full min-w-0 flex-col justify-between gap-4 border-l-4 border-l-brand-600 p-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="shield" className="h-6 w-6" />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-ink-900">Screening AI dimulai oleh HRD</p>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-inset ring-amber-200">
                    Menunggu tindakan HRD
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-xl leading-relaxed">
                  CV baru diproses setelah Anda memulai screening. Identitas pelamar tetap disamarkan; nama dan kontak baru terbuka setelah kandidat diundang wawancara.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                <Icon name="lock" className="h-3.5 w-3.5 text-slate-500" />
                Anti-Bias Terkunci
              </span>
            </div>
          </div>

          <div className="card flex w-full min-w-0 flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink-900">Proses screening kandidat</p>
              <p className="mt-1 text-xs text-slate-500">
                {screenedCount} selesai · {processingCount} sedang diproses · {screeningQueue.length} menunggu atau perlu dicoba ulang
              </p>
              {screeningProgress && (
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] font-semibold text-brand-700">
                    <span>{startingScreening ? "AI sedang menganalisis CV..." : "Proses screening terakhir"}</span>
                    <span>{screeningProgress.done}/{screeningProgress.total}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-100">
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all"
                      style={{ width: `${screeningProgress.total ? (screeningProgress.done / screeningProgress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => void startScreening()}
              disabled={startingScreening || scoring || screeningQueue.length === 0}
              className="btn-primary shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {startingScreening
                ? "Screening berjalan..."
                : screeningQueue.length > 0
                  ? `Mulai screening AI (${screeningQueue.length})`
                  : rows.length > 0 && screenedCount === rows.length
                    ? "Semua pelamar sudah discreen"
                    : "Belum ada pelamar"}
            </button>
          </div>

          {/* Status pemuatan daftar pelamar */}
          {scoring && (
            <div className="flex items-center gap-2.5 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-xs font-semibold text-brand-800">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              Memuat daftar pelamar...
            </div>
          )}
          {scoringError && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <Icon name="alert" className="h-4 w-4 shrink-0" />
              {scoringError}
            </div>
          )}

          {/* Daftar Leaderboard Seluruh Pelamar */}
          {sorted.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <Icon name="users" className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-semibold text-ink-900">Belum ada pelamar</p>
              <p className="mt-1 text-sm text-slate-500">
                Kandidat akan muncul di sini setelah ada yang melamar posisi ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
                  Daftar Pelamar ({sorted.length})
                </h2>
                <span className="text-xs text-slate-400">Klik baris untuk analisis AI lengkap</span>
              </div>

              {sorted.map((r, index) => {
                const screened = isScreened(r);
                const state = screeningStatus(r);
                const sm = screened ? scoreMeta(r.match.match_score) : { accent: "border-slate-200 bg-white" };
                const shortlisted = isShortlisted(r);
                const hasScheduledInterview = interviewSchedules.some(
                  (interview) => interview.application_id === r.application.id && interview.status === "scheduled",
                );

                return (
                  <div
                    key={r.application.id}
                    onClick={() => setSelectedId(r.application.id)}
                    className={`card flex w-full min-w-0 animate-fade-up flex-col justify-between gap-4 border-l-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer sm:flex-row sm:items-center ${sm.accent}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-400">
                        {index + 1}
                      </span>
                      <Avatar r={r} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="min-w-0 break-words font-bold text-ink-900">{displayName(r)}</p>
                          {shortlisted ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-300">
                              <Icon name="check" className="h-3 w-3 text-emerald-700" strokeWidth={3} />
                              Detail Terbuka (Diundang Wawancara)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              <Icon name="eyeOff" className="h-3 w-3 text-slate-400" />
                              Blind Aktif (Belum Diundang)
                            </span>
                          )}
                          {hasScheduledInterview && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-inset ring-blue-200">
                              Wawancara Terjadwal
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 break-words text-xs text-slate-500">
                          {screened
                            ? r.match.hr_strengths.join(" · ") || "Screening selesai; belum ada kekuatan yang dicatat."
                            : state === "processing"
                              ? "AI sedang menganalisis CV pelamar..."
                              : state === "failed"
                                ? r.application.screening_error || "Screening gagal; coba lagi."
                                : "CV menunggu HRD memulai screening AI."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                      {screened ? (
                        <ScoreBadge score={r.match.match_score} />
                      ) : (
                        <span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${state === "processing" ? "bg-sky-100 text-sky-800" : state === "failed" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-600"}`}>
                          {state === "processing" ? "Sedang discreen" : state === "failed" ? "Gagal · siap ulang" : "Belum discreen"}
                        </span>
                      )}

                      {/* Tombol Aksi: Otomatis Buka Identitas Saat Klik Undang Wawancara */}
                      {shortlisted ? (
                        <div className="flex items-center gap-1.5">
                          {r.candidate.phone && (
                            <a
                              href={`https://wa.me/${r.candidate.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                              title="Hubungi WhatsApp"
                            >
                              WhatsApp
                            </a>
                          )}
                          <button
                            onClick={() => setSelectedId(r.application.id)}
                            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                          >
                            Detail Profil
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => inviteCandidate(r.application.id)}
                          disabled={!screened}
                          className="btn-primary shrink-0 text-xs font-bold px-3 py-1.5 shadow-sm transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                          title="Undang wawancara untuk membuka detail identitas pelamar"
                        >
                          Undang Wawancara
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: SIDEBAR REQUIREMENT & DETAIL KANDIDAT RECOMMENDED */}
        <aside className="min-w-0 space-y-6">
          {/* CARD 1: Requirement Lowongan */}
          <div className="card w-full min-w-0 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <h3 className="font-bold text-ink-900 text-sm">Requirement Lowongan</h3>
              </div>
              <span className="chip text-xs">{requirementsList.length} Kualifikasi</span>
            </div>

            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Kualifikasi teknis yang digunakan AI untuk menguji dan memeringkat seluruh kandidat:
            </p>

            <ul className="mt-3.5 space-y-2.5">
              {requirementsList.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="font-medium leading-snug">{req}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span className="min-w-0 break-words">Lokasi: <b>{job.location}</b></span>
              <span className="min-w-0 break-words">Gaji: <b>{job.salary_range ?? "—"}</b></span>
            </div>
          </div>

          {/* CARD 2: Detail Kandidat yang Direkomendasikan (Highly Recommended) */}
          <div className="card-bold w-full min-w-0 border-l-4 border-l-emerald-500 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Icon name="zap" className="h-4 w-4" />
                </span>
                <h3 className="font-bold text-ink-900 text-sm">Kandidat Recommended</h3>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                {recommendedCandidates.length} Terpilih
              </span>
            </div>

            <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
              Kandidat dengan skor ≥ 80% yang paling memenuhi requirement posisi:
            </p>

            {recommendedCandidates.length === 0 ? (
              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
                Belum ada kandidat di kategori Highly Recommended.
              </div>
            ) : (
              <div className="mt-4 space-y-3.5">
                {recommendedCandidates.map((r) => {
                  const shortlisted = isShortlisted(r);
                  return (
                    <div
                      key={r.application.id}
                      className="min-w-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-emerald-400"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar r={r} />
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-ink-900 truncate">
                              {displayName(r)}
                            </p>
                            <span className="text-[11px] font-semibold text-emerald-700">
                              {r.match.match_score}% Highly Recommended
                            </span>
                          </div>
                        </div>
                        <ScoreRing score={r.match.match_score} size={42} />
                      </div>

                      {/* Status Identitas Otomatis */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Informasi Detail:</span>
                        {shortlisted ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Terbuka (Diundang Wawancara)
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            Terkunci (Belum Diundang)
                          </span>
                        )}
                      </div>

                      {/* Keunggulan Utama terhadap Requirement */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-bold text-slate-700">Kekuatan Utama:</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.match.hr_strengths.slice(0, 2).map((s, i) => (
                            <span
                              key={i}
                              className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                            >
                              ✓ {s}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Tombol Aksi Cepat */}
                      <div className="mt-3 flex gap-2 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => setSelectedId(r.application.id)}
                          className="flex-1 rounded-lg border border-slate-300 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                        >
                          Analisis AI
                        </button>
                        <button
                          onClick={() => inviteCandidate(r.application.id)}
                          disabled={shortlisted}
                          className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                            shortlisted
                              ? "bg-emerald-600 text-white cursor-default"
                              : "btn-primary shadow-sm hover:scale-105"
                          }`}
                        >
                          {shortlisted ? "Diundang" : "Undang"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Explainable AI Card (Drawer Modal) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex h-dvh w-full max-w-lg animate-slide-in flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-ink-950 p-5 text-white sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 animate-float rounded-full bg-brand-600/40 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white p-1">
                    {isScreened(selected) ? (
                      <ScoreRing score={selected.match.match_score} size={64} />
                    ) : (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                        {screeningStatus(selected) === "processing" ? "AI..." : "Menunggu"}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-400">
                      {isScreened(selected) ? "Explainable AI Card" : "Screening AI belum selesai"}
                    </p>
                    <h2 className="mt-0.5 text-xl font-bold">{displayName(selected)}</h2>
                    <div className="mt-1.5">
                      {isScreened(selected) ? (
                        <ScoreBadge score={selected.match.match_score} />
                      ) : (
                        <span className="text-xs font-semibold text-slate-300">
                          {screeningStatus(selected) === "failed" ? "Gagal diproses" : screeningStatus(selected) === "processing" ? "Sedang dianalisis" : "Menunggu HRD"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                  aria-label="Tutup"
                >
                  <Icon name="x" className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-5">
              {/* Notifikasi Status Blind Screening */}
              {isShortlisted(selected) ? (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                    <Icon name="check" className="h-4 w-4 text-emerald-700" strokeWidth={3} />
                    Informasi Detail Pelamar Terbuka
                  </div>
                  <p className="text-xs mt-1 text-emerald-800">
                    Pelamar ini sudah diundang wawancara sehingga nama asli dan kontak resmi telah dibuka secara otomatis.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 text-xs">
                  <span className="font-bold text-sm block mb-1">🔒 Identitas Terkunci (Blind Screening Aktif)</span>
                  Nama asli, nomor telepon, dan email pelamar ini disamarkan demi objektivitas seleksi. Tekan tombol <b>&quot;Undang Wawancara&quot;</b> di bawah untuk membuka informasi detailnya secara otomatis.
                </div>
              )}

              <AiInsight title={isScreened(selected) ? "Ringkasan Evaluasi AI" : "Status Screening AI"}>
                {isScreened(selected)
                  ? <>{selected.match.candidate_feedback} <span className="mt-2 block">Hasil: <b className="text-ink-900">{scoreMeta(selected.match.match_score).label}</b> dengan skor kecocokan <b className="text-ink-900">{selected.match.match_score}%</b>{selected.match.ai_confidence ? ` · keyakinan AI ${selected.match.ai_confidence}%` : ""}.</span></>
                  : screeningStatus(selected) === "processing"
                    ? "AI sedang membaca CV dan membandingkannya dengan requirement lowongan."
                    : screeningStatus(selected) === "failed"
                      ? selected.application.screening_error || "Screening gagal. Jalankan ulang screening dari panel lowongan."
                      : "HRD belum memulai screening untuk CV ini. Mulai screening dari panel di halaman lowongan."}
              </AiInsight>

              <section className="rounded-xl border border-brand-200 bg-brand-50/60 p-4">
                <h3 className="text-sm font-bold text-ink-900">Jadwalkan Wawancara</h3>
                {interviewsLoading ? (
                  <p className="mt-2 text-xs text-slate-500">Memuat status jadwal wawancara...</p>
                ) : interviewsError ? (
                  <div className="mt-2 space-y-2">
                    <p role="alert" className="text-xs text-rose-700">{interviewsError}</p>
                    <Link href="/hrd/interviews" className="text-xs font-semibold text-brand-700 underline">
                      Lihat di Jadwal Interview
                    </Link>
                  </div>
                ) : selected.application.status === "rejected" ? (
                  <p className="mt-2 text-xs text-slate-600">Pelamar yang ditolak tidak dapat dijadwalkan untuk wawancara.</p>
                ) : !isScreened(selected) ? (
                  <p className="mt-2 text-xs text-slate-600">Selesaikan screening AI sebelum mengundang dan menjadwalkan wawancara.</p>
                ) : selectedInterview ? (
                  <div className="mt-3 space-y-3 rounded-lg border border-white bg-white p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">Status</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${selectedInterview.status === "scheduled" ? "bg-emerald-50 text-emerald-700" : selectedInterview.status === "completed" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-700"}`}>
                        {selectedInterview.status === "scheduled" ? "Terjadwal" : selectedInterview.status === "completed" ? "Selesai" : "Dibatalkan"}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">
                        {new Date(selectedInterview.scheduled_at).toLocaleDateString("id-ID", { dateStyle: "full" })}
                      </p>
                      <p className="text-sm text-slate-600">
                        {new Date(selectedInterview.scheduled_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="break-words text-xs text-slate-600">
                      {selectedInterview.meeting_url ? (
                        <a href={selectedInterview.meeting_url} target="_blank" rel="noreferrer" className="font-semibold text-brand-700 underline">
                          {selectedInterview.meeting_url}
                        </a>
                      ) : "Tautan meeting tidak dicantumkan."}
                    </div>
                    {selectedInterview.notes && <p className="whitespace-pre-wrap break-words text-xs text-slate-600">{selectedInterview.notes}</p>}
                    <Link href="/hrd/interviews" className="inline-flex text-xs font-semibold text-brand-700 underline">
                      Lihat di Jadwal Interview
                    </Link>
                  </div>
                ) : (
                  <form
                    className="mt-3 space-y-3"
                    onSubmit={(event) => { event.preventDefault(); void scheduleInterview(); }}
                  >
                    <label className="label block">
                      Tanggal dan waktu
                      <input
                        className="input mt-1 w-full"
                        type="datetime-local"
                        value={scheduleDate}
                        min={minScheduleDate}
                        required
                        onChange={(event) => setScheduleDate(event.target.value)}
                      />
                    </label>
                    <label className="label block">
                      Tautan meeting (opsional)
                      <input
                        className="input mt-1 w-full"
                        type="url"
                        placeholder="https://..."
                        value={scheduleMeetingUrl}
                        maxLength={2048}
                        onChange={(event) => setScheduleMeetingUrl(event.target.value)}
                      />
                    </label>
                    <label className="label block">
                      Catatan
                      <textarea
                        className="input mt-1 min-h-20 w-full"
                        placeholder="Agenda atau instruksi untuk kandidat"
                        value={scheduleNotes}
                        maxLength={4000}
                        onChange={(event) => setScheduleNotes(event.target.value)}
                      />
                    </label>
                    {scheduleError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{scheduleError}</p>}
                    <button
                      type="submit"
                      disabled={savingSchedule}
                      className="btn-primary inline-flex w-full items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingSchedule ? "Menyimpan jadwal..." : isShortlisted(selected) ? "Jadwalkan Wawancara" : "Jadwalkan & Undang Wawancara"}
                    </button>
                  </form>
                )}
              </section>

              {isScreened(selected) && selected.match.ai_criteria_scores?.skill_score !== undefined && selected.match.ai_criteria_scores.experience_score !== undefined && (
                <section className="rounded-xl border border-violet-200 bg-violet-50/70 p-4">
                  <h3 className="text-sm font-bold text-ink-900">Rincian skor berbobot</h3>
                  <p className="mt-1 text-xs text-slate-600">Skor akhir dihitung dari bobot yang aktif saat screening dimulai.</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-lg bg-white/80 p-3"><dt className="text-slate-500">Keterampilan · {selected.match.ai_criteria_scores.weights?.skill_weight ?? 60}%</dt><dd className="mt-1 text-lg font-bold text-ink-900">{selected.match.ai_criteria_scores.skill_score}%</dd></div>
                    <div className="rounded-lg bg-white/80 p-3"><dt className="text-slate-500">Pengalaman · {selected.match.ai_criteria_scores.weights?.experience_weight ?? 30}%</dt><dd className="mt-1 text-lg font-bold text-ink-900">{selected.match.ai_criteria_scores.experience_score}%</dd></div>
                    <div className="rounded-lg bg-white/80 p-3"><dt className="text-slate-500">Pendidikan · {selected.match.ai_criteria_scores.education_applicable ? `${selected.match.ai_criteria_scores.weights?.education_weight ?? 10}%` : "tidak diterapkan"}</dt><dd className="mt-1 text-lg font-bold text-ink-900">{selected.match.ai_criteria_scores.education_applicable ? `${selected.match.ai_criteria_scores.education_score ?? 0}%` : "—"}</dd></div>
                  </dl>
                </section>
              )}

              {screeningStatus(selected) === "processing" && (
                <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-ink-900">Tahapan analisis AI</h3>
                    <span className="text-xs font-semibold text-brand-700">{selected.application.screening_step ?? 0}/4 tahap</span>
                  </div>
                  <ol className="space-y-2.5">
                    {[
                      ["Memeriksa CV", "Mengecek apakah dokumen berisi informasi yang bisa dianalisis."],
                      ["Melindungi identitas", "Menyamarkan informasi pribadi sebelum penilaian kompetensi."],
                      ["Membandingkan kualifikasi", "Mencocokkan skill dan bukti pengalaman di CV dengan kebutuhan lowongan."],
                      ["Menyusun evaluasi", "Merangkum kecocokan, gap, skor, dan pertanyaan wawancara."],
                    ].map((step, index) => {
                      const complete = (selected.application.screening_step ?? 0) > index;
                      const active = (selected.application.screening_step ?? 0) === index + 1;
                      return (
                        <li key={step[0]} className={`flex items-start gap-2.5 text-xs ${complete || active ? "text-brand-900" : "text-slate-400"}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${complete ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white" : "border border-slate-300 bg-white"}`}>
                            {complete ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : active ? <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> : index + 1}
                          </span>
                          <span className="min-w-0 flex-1"><span className={`block ${active ? "font-bold" : "font-semibold"}`}>{step[0]}</span><span className="mt-0.5 block leading-relaxed text-slate-500">{step[1]}</span></span>
                          {active && <span className="shrink-0 animate-pulse text-[10px] font-semibold text-brand-700">Berjalan</span>}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              )}

              {isScreened(selected) && selected.match.ai_evidence && selected.match.ai_evidence.length > 0 && (
                <section className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                  <h3 className="text-sm font-bold text-sky-900">Bukti yang ditemukan di CV</h3>
                  <p className="mt-1 text-xs text-sky-800">Potongan informasi yang digunakan AI sebagai dasar penilaian.</p>
                  <ul className="mt-3 space-y-2">
                    {selected.match.ai_evidence.map((evidence) => <li key={evidence} className="rounded-lg bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-700">“{evidence}”</li>)}
                  </ul>
                </section>
              )}

              <section className="rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-ink-900">Surat Lamaran</h3>
                {documentResolvedFor !== selected.application.id ? (
                  <p className="mt-2 text-sm text-slate-500">Memuat surat lamaran...</p>
                ) : !isShortlisted(selected) ? (
                  <p className="mt-2 text-sm text-slate-500">Surat lamaran terbuka setelah kandidat diundang wawancara.</p>
                ) : !applicationDocument || applicationDocument.application_id !== selected.application.id ? (
                  <p className="mt-2 text-sm text-slate-500">Belum ada surat lamaran tersimpan.</p>
                ) : (
                  <div className="mt-2 space-y-3 text-sm text-slate-700">
                    {applicationDocument.cover_letter && (
                      <p className="whitespace-pre-wrap">{applicationDocument.cover_letter}</p>
                    )}
                    {applicationDocument.file_name && (
                      <a
                        className="inline-flex items-center gap-2 font-semibold text-brand-700 underline"
                        href={`/api/applications/${selected.application.id}/file`}
                      >
                        <Icon name="file" className="h-4 w-4" />
                        Unduh {applicationDocument.file_name} ({(applicationDocument.file_size / (1024 * 1024)).toFixed(2)} MB)
                      </a>
                    )}
                  </div>
                )}
              </section>

              {isScreened(selected) && <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.5} />
                  Kekuatan Utama Kandidat
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {selected.match.hr_strengths.length ? selected.match.hr_strengths.map((s) => (
                    <li key={s} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  )) : <li className="text-xs text-slate-500">AI tidak menemukan kekuatan spesifik yang dapat dicatat dari CV.</li>}
                </ul>
              </section>}

              {isScreened(selected) && <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <Icon name="alert" className="h-4 w-4" />
                  Celah Kompetensi (Gaps)
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.match.hr_gaps.length ? selected.match.hr_gaps.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                    >
                      {g}
                    </span>
                  )) : <span className="text-xs text-slate-500">Tidak ada gap utama yang dicatat AI.</span>}
                </div>
              </section>}

              {isScreened(selected) && <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Icon name="mic" className="h-4 w-4 text-brand-600" />
                  3 Pertanyaan Wawancara Rekomendasi AI
                </h3>
                <ol className="mt-3 space-y-3">
                  {selected.match.interview_questions.map((q, i) => (
                    <li
                      key={q}
                      className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-sky-500 text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      {q}
                    </li>
                  ))}
                </ol>
              </section>}

              {isShortlisted(selected) && (
                <section className="animate-fade-up rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <h3 className="font-semibold text-emerald-800">
                    Identitas Resmi Terbuka
                  </h3>
                  <ul className="mt-3 space-y-2.5 text-emerald-900">
                    <li className="flex items-center gap-2.5">
                      <Icon name="user" className="h-4 w-4 text-emerald-700" />
                      <b>{selected.candidate.name}</b>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icon name="mail" className="h-4 w-4 text-emerald-700" />
                      <a href={`mailto:${selected.candidate.email}`} className="underline hover:text-emerald-950 font-medium">
                        {selected.candidate.email}
                      </a>
                    </li>
                    {selected.candidate.phone && (
                      <li className="flex items-center gap-2.5">
                        <Icon name="phone" className="h-4 w-4 text-emerald-700" />
                        <a
                          href={`https://wa.me/${selected.candidate.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-emerald-800 underline hover:text-emerald-950"
                        >
                          {selected.candidate.phone} (Hubungi via WhatsApp)
                        </a>
                      </li>
                    )}
                    {selected.candidate.portfolio_url && (
                      <li className="flex items-center gap-2.5">
                        <Icon name="link" className="h-4 w-4 text-emerald-700" />
                        <a
                          href={`https://${selected.candidate.portfolio_url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium underline hover:text-emerald-950 truncate"
                        >
                          {selected.candidate.portfolio_url}
                        </a>
                      </li>
                    )}
                  </ul>
                </section>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row">
              <button
                onClick={() => inviteCandidate(selected.application.id)}
                disabled={isShortlisted(selected) || !isScreened(selected)}
                className={`flex-1 font-bold ${
                  isShortlisted(selected)
                    ? "bg-emerald-600 text-white cursor-default rounded-xl py-2.5"
                    : !isScreened(selected)
                      ? "rounded-xl bg-slate-100 py-2.5 text-slate-400 cursor-not-allowed"
                      : "btn-primary"
                }`}
              >
                {isShortlisted(selected)
                  ? "Sudah Diundang (Detail Terbuka)"
                  : isScreened(selected)
                    ? "Undang Wawancara (Buka Identitas)"
                    : "Tunggu Screening AI"}
              </button>
              <button
                onClick={() => setStatus(selected.application.id, "rejected")}
                disabled={selected.application.status === "rejected" || !isScreened(selected)}
                className="btn-danger flex-1"
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
