"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ApplyDialog from "@/src/components/ApplyDialog";
import Icon from "@/src/components/Icons";
import { CompanyAvatar, VerifiedBadge } from "@/src/components/JobCard";
import ScoreBadge, { ScoreRing } from "@/src/components/ScoreBadge";
import { AiInsight } from "@/src/components/AiUi";
import { formatDate, splitLines } from "@/src/lib/format";
import { createApplication } from "@/src/lib/application-client";
import { notifyDataChanged } from "@/src/lib/client-events";
import { useCurrentUser } from "@/src/lib/use-current-user";
import type { ApplyFormValues } from "@/src/components/ApplyDialog";
import { screenCvAgainstJob, toJobMatch } from "@/src/lib/screen-client";
import { useAllApplications } from "@/src/lib/use-all-applications";
import type { Job, JobMatch } from "@/src/types/hirematch";

export default function JobDetailClient({
  jobId,
  candidateMode = false,
}: {
  jobId: number;
  candidateMode?: boolean;
}) {
  const { user } = useCurrentUser();
  const isCandidateAuth = candidateMode || user?.role === "candidate";
  const backHref = isCandidateAuth ? "/candidate/jobs" : "/";
  const backLabel = isCandidateAuth
    ? "Kembali ke Cari Lowongan"
    : "Kembali ke Dashboard Publik";

  const [job, setJob] = useState<Job | null>(null);
  const [jobLoaded, setJobLoaded] = useState(false);
  const company = job ? {
    company_name: job.company_name,
    industry: job.company_industry,
    email: job.company_email,
    legal_number: job.company_legal_number,
    is_verified: job.company_is_verified,
  } : undefined;
  const candidate = user?.role === "candidate" ? user : undefined;

  const [match, setMatch] = useState<JobMatch | null>(null);
  const [screening, setScreening] = useState(false);
  const [screenError, setScreenError] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const applications = useAllApplications();
  const hasApplied = applications.some(
    (application) =>
      application.job_id === jobId &&
      application.candidate_id === user?.id
  );

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
    if (!job || !isCandidateAuth || user?.role !== "candidate") return;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setScreening(true);
      setScreenError("");
    });

    fetch("/api/candidate/cv", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unggah CV terlebih dahulu melalui Dashboard Pelamar.");
        return (await response.json() as { cv_text: string }).cv_text;
      })
      .then((cvText) => screenCvAgainstJob(
        cvText,
        job,
        company?.company_name ?? undefined,
        company?.email ?? undefined,
      ))
      .then((response) => {
        if (cancelled) return;
        if (response.status === "scored") {
          void fetch("/api/candidate/cv", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cv_text: response.validation.redacted_cv }),
          });
          setMatch(
            toJobMatch(job.id, user.id, response.match)
          );
          return;
        }
        if (response.status === "rejected") {
          setScreenError(
            response.validation.reject_reason ??
              "CV tidak terdeteksi sebagai dokumen yang sah."
          );
          return;
        }
        setScreenError("Respons screening tidak dikenali.");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setScreenError(
          err instanceof Error ? err.message : "Gagal menganalisis CV."
        );
      })
      .finally(() => {
        if (!cancelled) setScreening(false);
      });

    return () => {
      cancelled = true;
    };
  }, [job, isCandidateAuth, user?.id, user?.role, company?.company_name, company?.email]);

  if (!job) {
    if (!jobLoaded) return <div className="mx-auto max-w-3xl px-4 py-20 text-center text-slate-500">Memuat lowongan...</div>;
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Icon name="alert" className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-bold text-ink-900">Lowongan Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500">
          Lowongan yang Anda cari mungkin sudah ditutup atau tidak tersedia.
        </p>
        <Link
          href={backHref}
          className="mt-6 inline-flex items-center gap-2 font-bold text-brand-600 hover:underline"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>
    );
  }

  const requirementsList = splitLines(job.requirements);

  async function handleApply(values: ApplyFormValues) {
    if (!job || !match || user?.role !== "candidate" || hasApplied || applying) return;

    setApplying(true);
    setScreenError("");

    try {
      await createApplication(match, values);
      notifyDataChanged();
      setApplyOpen(false);
    } catch (err: unknown) {
      setScreenError(
        err instanceof Error ? err.message : "Gagal mengirim lamaran."
      );
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {/* Navigasi Kembali ke Dashboard Publik */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-600 transition"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          {backLabel}
        </Link>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Detail Lowongan Pekerjaan
        </span>
      </div>

      {/* Header Utama Lowongan */}
      <section className="card-bold p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <CompanyAvatar
              name={company?.company_name}
              className="h-16 w-16 text-2xl shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-ink-900 md:text-3xl">
                  {job.title}
                </h1>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Lowongan Buka
                </span>
              </div>
              <p className="mt-1 flex items-center gap-2 text-base font-medium text-slate-600">
                <span>{company?.company_name}</span>
                {company?.is_verified && <VerifiedBadge />}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="chip font-medium">
                  <Icon name="pin" className="h-3.5 w-3.5 text-slate-500" />
                  {job.location}
                </span>
                {job.salary_range && (
                  <span className="chip font-bold text-brand-700">
                    <Icon name="wallet" className="h-3.5 w-3.5 text-brand-600" />
                    {job.salary_range}
                  </span>
                )}
                <span className="chip font-medium">
                  <Icon name="calendar" className="h-3.5 w-3.5 text-slate-500" />
                  Diposting {formatDate(job.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Aksi / Lamar (Terintegrasi Penuh Tanpa Sidebar) */}
        <div className="mt-8 rounded-xl border border-brand-200 bg-brand-50/60 p-5">
          {!isCandidateAuth ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-bold text-ink-900 text-base">
                  Tertarik melamar posisi ini?
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Masuk sebagai Pelamar untuk mencocokkan CV Anda dengan AI, lalu lengkapi data lamaran sebelum dikirim.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2.5">
                <Link
                  href={`/login?role=candidate&from=job&jobId=${job.id}&jobTitle=${encodeURIComponent(
                    job.title
                  )}&redirect=${encodeURIComponent(`/candidate/jobs/${job.id}`)}`}
                  className="btn-primary btn-hard text-sm font-bold px-4 py-2"
                >
                  Masuk sebagai Pelamar
                  <Icon name="arrowRight" className="h-4 w-4 inline ml-1" />
                </Link>
                <Link
                  href="/register?role=candidate"
                  className="btn-outline text-sm font-bold px-4 py-2"
                >
                  Daftar Akun Baru
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {screening ? (
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
                    AI sedang mencocokkan CV Anda dengan lowongan ini…
                  </div>
                ) : match ? (
                  <div className="flex items-center gap-3">
                    <ScoreRing score={match.match_score} size={50} />
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase">Analisis AI CV Anda</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-ink-900">{match.match_score}% Cocok</span>
                        <ScoreBadge score={match.match_score} showLabel={false} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    {screenError || "Masuk sebagai Pelamar terverifikasi."}
                  </p>
                )}
                <button
                  onClick={() => setApplyOpen(true)}
                  disabled={hasApplied || applying || screening || !match}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm ${
                    hasApplied
                      ? "bg-emerald-600 text-white cursor-default"
                      : "btn-primary btn-hard"
                  }`}
                >
                  {hasApplied ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="check" className="h-4 w-4" strokeWidth={3} />
                      Sudah dilamar
                    </span>
                  ) : applying || screening ? (
                    "Memproses AI…"
                  ) : (
                    "Lengkapi Lamaran"
                  )}
                </button>
              </div>
              {match && (
                <div className="border-t border-brand-100 pt-3">
                  <AiInsight title="Resume Feedback">
                    {match.candidate_feedback}
                  </AiInsight>
                  {match.hr_gaps.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {match.hr_gaps.map((gap) => (
                        <span
                          key={gap}
                          className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                        >
                          Kurang: {gap}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {screenError && (
                <p className="flex items-center gap-1.5 border-t border-brand-100 pt-3 text-xs text-red-600">
                  <Icon name="alert" className="h-3.5 w-3.5" />
                  {screenError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Deskripsi Pekerjaan */}
      <section className="card p-6 md:p-8">
        <h2 className="text-xl font-bold text-ink-900">Deskripsi Pekerjaan</h2>
        <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-700">
          {job.description}
        </p>
      </section>

      {/* Persyaratan / Kualifikasi */}
      <section className="card p-6 md:p-8">
        <h2 className="text-xl font-bold text-ink-900">Kualifikasi &amp; Persyaratan</h2>
        <ul className="mt-4 space-y-3">
          {requirementsList.map((req, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="leading-relaxed font-medium">{req}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Tentang Perusahaan */}
      <section className="card p-6 md:p-8">
        <h2 className="text-xl font-bold text-ink-900">Tentang Perusahaan</h2>
        <div className="mt-4 flex items-start gap-4">
          <CompanyAvatar name={company?.company_name} className="h-12 w-12 text-lg shrink-0" />
          <div>
            <h3 className="font-bold text-ink-900 flex items-center gap-1.5">
              {company?.company_name}
              {company?.is_verified && <VerifiedBadge />}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {company?.is_verified ? "Perusahaan terverifikasi" : "Verifikasi perusahaan dalam proses"}
            </p>
            {company?.industry && <p className="mt-2 text-sm font-medium text-slate-700">Bidang usaha: {company.industry}</p>}
            <p className="mt-2 text-sm text-slate-600">
              Perusahaan ini telah menggunakan sistem rekrutmen objektif berbasis AI di platform RanahTalenta.
            </p>
          </div>
        </div>
      </section>

      {applyOpen && match && (
        <ApplyDialog
          job={job}
          candidate={candidate}
        match={match}
          submitting={applying}
          error={screenError}
          onClose={() => {
            if (!applying) setApplyOpen(false);
          }}
          onConfirm={(values) => {
            void handleApply(values);
          }}
        />
      )}
    </div>
  );
}
