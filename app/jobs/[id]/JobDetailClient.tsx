"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/src/components/Icons";
import { CompanyAvatar, VerifiedBadge } from "@/src/components/JobCard";
import ScoreBadge, { ScoreRing } from "@/src/components/ScoreBadge";
import { AiInsight } from "@/src/components/AiUi";
import {
  CURRENT_CANDIDATE_ID,
  applications as allApplications,
  getJob,
  getUser,
  jobMatches,
} from "@/src/data/mockData";
import { formatDate, splitLines } from "@/src/lib/format";

export default function JobDetailClient({ jobId }: { jobId: number }) {
  const searchParams = useSearchParams();
  const isCandidateAuth = searchParams.get("auth") === "candidate";

  const job = getJob(jobId);
  const company = job ? getUser(job.hrd_id) : undefined;
  const match = jobMatches.find(
    (m) => m.job_id === jobId && m.candidate_id === CURRENT_CANDIDATE_ID
  );

  const [hasApplied, setHasApplied] = useState(() =>
    allApplications.some(
      (a) => a.job_id === jobId && a.candidate_id === CURRENT_CANDIDATE_ID
    )
  );

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Icon name="alert" className="mx-auto h-12 w-12 text-slate-300" />
        <h1 className="mt-4 text-2xl font-bold text-ink-900">Lowongan Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500">
          Lowongan yang Anda cari mungkin sudah ditutup atau tidak tersedia.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 font-bold text-brand-600 hover:underline"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          Kembali ke Dashboard Publik
        </Link>
      </div>
    );
  }

  const requirementsList = splitLines(job.requirements);

  function handleApply() {
    setHasApplied(true);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {/* Navigasi Kembali ke Dashboard Publik */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-brand-600 transition"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          Kembali ke Dashboard Publik
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
                  Masuk sebagai Pelamar untuk mencocokkan CV Anda dengan AI dan melamar pekerjaan dalam 1-klik.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2.5">
                <Link
                  href={`/login?role=candidate&from=job&jobId=${job.id}&jobTitle=${encodeURIComponent(
                    job.title
                  )}&redirect=${encodeURIComponent(`/jobs/${job.id}?auth=candidate`)}`}
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
                {match ? (
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
                    Masuk sebagai Pelamar terverifikasi.
                  </p>
                )}
                <button
                  onClick={handleApply}
                  disabled={hasApplied}
                  className={`px-6 py-2.5 rounded-xl font-bold text-sm ${
                    hasApplied
                      ? "bg-emerald-600 text-white cursor-default"
                      : "btn-primary btn-hard"
                  }`}
                >
                  {hasApplied ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Icon name="check" className="h-4 w-4" strokeWidth={3} />
                      Lamaran Berhasil Terkirim
                    </span>
                  ) : (
                    "Lamar Sekarang (1-Klik AI)"
                  )}
                </button>
              </div>
              {match && (
                <div className="border-t border-brand-100 pt-3">
                  <AiInsight title="Resume Feedback">
                    {match.candidate_feedback}
                  </AiInsight>
                </div>
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
              Legalitas: {company?.legal_number ? `NIB/NPWP terdaftar (${company.legal_number})` : "Dalam proses verifikasi"}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Perusahaan ini telah menggunakan sistem rekrutmen objektif berbasis AI di platform RanahTalenta.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
