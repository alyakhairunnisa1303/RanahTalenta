"use client";

import { useState } from "react";
import Link from "next/link";
import ScoreBadge from "@/src/components/ScoreBadge";
import {
  applicationStatusMeta,
  getApplicantsForJob,
  getJob,
} from "@/src/data/mockData";
import type {
  ApplicantRow,
  ApplicationStatus,
} from "@/src/types/hirematch";

export default function HrdJobDetailClient({ jobId }: { jobId: number }) {
  const job = getJob(jobId);

  const [rows, setRows] = useState<ApplicantRow[]>(() =>
    getApplicantsForJob(jobId)
  );
  const [blind, setBlind] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">
        Lowongan tidak ditemukan. {" "}
        <Link href="/hrd/dashboard" className="text-brand-600 underline">
          Kembali ke dashboard
        </Link>
      </div>
    );
  }

  // Urut dari skor tertinggi ke terendah (ORDER BY match_score DESC)
  const sorted = [...rows].sort((a, b) => b.match.match_score - a.match.match_score);
  const selected = rows.find((r) => r.application.id === selectedId);

  function setStatus(applicationId: number, status: ApplicationStatus) {
    setRows((prev) =>
      prev.map((r) =>
        r.application.id === applicationId
          ? { ...r, application: { ...r.application, status } }
          : r
      )
    );
  }

  // Identitas terbuka jika blind mode mati atau kandidat sudah di-shortlist
  const revealed = (r: ApplicantRow) =>
    !blind || r.application.status === "shortlisted";
  const displayName = (r: ApplicantRow) =>
    revealed(r)
      ? r.candidate.name
      : `Kandidat #${String(r.application.id).padStart(3, "0")}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/hrd/dashboard" className="text-sm text-slate-500 hover:text-brand-600">
        ← Dashboard
      </Link>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-sm text-slate-600">
            {rows.length} pelamar · diurutkan dari skor tertinggi
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 ring-1 ring-slate-200">
          <span className="text-sm font-medium">🕶️ Blind Screening</span>
          <button
            type="button"
            role="switch"
            aria-checked={blind}
            onClick={() => setBlind(!blind)}
            className={`relative h-6 w-11 rounded-full transition ${
              blind ? "bg-brand-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                blind ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      {sorted.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-slate-500">
          Belum ada pelamar untuk lowongan ini.
        </div>
      ) : (
        <div className="card mt-6 divide-y divide-slate-100">
          {sorted.map((r, index) => {
            const meta = applicationStatusMeta[r.application.status];
            return (
              <button
                key={r.application.id}
                onClick={() => setSelectedId(r.application.id)}
                className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{displayName(r)}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.match.hr_strengths.join(" · ")}
                  </p>
                </div>
                <span
                  className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${meta.className}`}
                >
                  {meta.label}
                </span>
                <ScoreBadge score={r.match.match_score} />
              </button>
            );
          })}
        </div>
      )}

      {/* Explainable AI Card (modal) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="card max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Explainable AI Card
                </p>
                <h2 className="mt-1 text-xl font-bold">{displayName(selected)}</h2>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="mt-3">
              <ScoreBadge score={selected.match.match_score} />
            </div>

            <section className="mt-5">
              <h3 className="font-semibold text-emerald-700">✔ Kekuatan Utama</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {selected.match.hr_strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>

            <section className="mt-5">
              <h3 className="font-semibold text-amber-700">! Celah Kompetensi (Gap)</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.match.hr_gaps.map((g) => (
                  <span
                    key={g}
                    className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-5">
              <h3 className="font-semibold">🎤 3 Pertanyaan Wawancara dari AI</h3>
              <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-700">
                {selected.match.interview_questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ol>
            </section>

            {selected.application.status === "shortlisted" && (
              <section className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm">
                <h3 className="font-semibold text-emerald-800">
                  Identitas Kandidat Terbuka
                </h3>
                <ul className="mt-2 space-y-1 text-emerald-900">
                  <li>👤 {selected.candidate.name}</li>
                  <li>✉️ {selected.candidate.email}</li>
                  {selected.candidate.phone && <li>📱 {selected.candidate.phone}</li>}
                  {selected.candidate.portfolio_url && (
                    <li>🔗 {selected.candidate.portfolio_url}</li>
                  )}
                </ul>
              </section>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => setStatus(selected.application.id, "shortlisted")}
                disabled={selected.application.status === "shortlisted"}
                className="btn-primary flex-1"
              >
                {selected.application.status === "shortlisted"
                  ? "Sudah di-Shortlist"
                  : "Shortlist / Undang Wawancara"}
              </button>
              <button
                onClick={() => setStatus(selected.application.id, "rejected")}
                disabled={selected.application.status === "rejected"}
                className="btn-outline flex-1 !text-red-600"
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
