"use client";

import { useState } from "react";
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
import {
  applicationStatusMeta,
  getApplicantsForJob,
  getJob,
} from "@/src/data/mockData";
import type {
  ApplicantRow,
  ApplicationStatus,
} from "@/src/types/hirematch";

export default function JobDetailClient({ jobId }: { jobId: number }) {
  const job = getJob(jobId);

  const [rows, setRows] = useState<ApplicantRow[]>(() =>
    getApplicantsForJob(jobId)
  );
  const [blind, setBlind] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  if (!job) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-500">
        Lowongan tidak ditemukan.{" "}
        <Link href="/hrd/dashboard" className="font-semibold text-brand-600 underline">
          Kembali ke dashboard
        </Link>
      </div>
    );
  }

  // Urut dari skor tertinggi ke terendah (ORDER BY match_score DESC)
  const sorted = [...rows].sort((a, b) => b.match.match_score - a.match.match_score);
  const selected = rows.find((r) => r.application.id === selectedId);

  const high = rows.filter((r) => r.match.match_score >= 80).length;
  const mid = rows.filter(
    (r) => r.match.match_score >= 60 && r.match.match_score < 80
  ).length;
  const low = rows.length - high - mid;

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

  const Avatar = ({ r }: { r: ApplicantRow }) =>
    revealed(r) ? (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-sky-500 text-sm font-bold text-white">
        {r.candidate.name.charAt(0)}
      </span>
    ) : (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name="eyeOff" className="h-4 w-4" />
      </span>
    );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
      <Link
        href="/hrd/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Dashboard
      </Link>

      <Hero
        eyebrow="Peringkat kandidat AI"
        title={job.title}
        subtitle={`${rows.length} pelamar, diurutkan dari skor kecocokan tertinggi.`}
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

      {/* Toolbar */}
      <div className="card flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon name={blind ? "eyeOff" : "eye"} className="h-[18px] w-[18px]" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink-900">Blind Screening</p>
            <p className="text-xs text-slate-500">
              {blind
                ? "Identitas disamarkan sampai kandidat di-shortlist"
                : "Identitas kandidat terlihat"}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={blind}
          aria-label="Blind Screening"
          onClick={() => setBlind(!blind)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${
            blind ? "bg-brand-600" : "bg-slate-300"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              blind ? "left-[22px]" : "left-0.5"
            }`}
          />
        </button>
      </div>

      {/* Leaderboard */}
      {sorted.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <Icon name="users" className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 font-semibold text-ink-900">Belum ada pelamar</p>
          <p className="mt-1 text-sm text-slate-500">
            Kandidat akan muncul di sini setelah ada yang melamar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((r, index) => {
            const meta = applicationStatusMeta[r.application.status];
            const sm = scoreMeta(r.match.match_score);
            return (
              <button
                key={r.application.id}
                onClick={() => setSelectedId(r.application.id)}
                className={`card flex w-full animate-fade-up items-center gap-4 border-l-4 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${sm.accent}`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-400">
                  {index + 1}
                </span>
                <Avatar r={r} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{displayName(r)}</p>
                  <p className="truncate text-sm text-slate-500">
                    {r.match.hr_strengths.join(" · ")}
                  </p>
                </div>
                <span
                  className={`hidden whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold md:inline ${meta.className}`}
                >
                  {meta.label}
                </span>
                <ScoreBadge score={r.match.match_score} />
              </button>
            );
          })}
        </div>
      )}

      {/* Explainable AI Card (drawer) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in justify-end bg-slate-900/40 backdrop-blur-[2px]"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex h-full w-full max-w-xl animate-slide-in flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden bg-ink-950 p-6 text-white">
              <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 animate-float rounded-full bg-brand-600/40 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-white p-1">
                    <ScoreRing score={selected.match.match_score} size={64} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-400">
                      Explainable AI Card
                    </p>
                    <h2 className="mt-0.5 text-xl font-bold">{displayName(selected)}</h2>
                    <div className="mt-1.5">
                      <ScoreBadge score={selected.match.match_score} />
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

            <div className="flex-1 space-y-7 overflow-y-auto p-6">
              <AiInsight title="Ringkasan AI">
                Skor kecocokan <b className="text-ink-900">{selected.match.match_score}%</b>{" "}
                ({scoreMeta(selected.match.match_score).label}) dengan{" "}
                {selected.match.hr_strengths.length} kekuatan utama dan{" "}
                {selected.match.hr_gaps.length} celah kompetensi.
              </AiInsight>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.5} />
                  Kekuatan utama
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {selected.match.hr_strengths.map((s) => (
                    <li key={s} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                  <Icon name="alert" className="h-4 w-4" />
                  Celah kompetensi
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.match.hr_gaps.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Icon name="mic" className="h-4 w-4 text-brand-600" />
                  3 pertanyaan wawancara dari AI
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
              </section>

              {selected.application.status === "shortlisted" && (
                <section className="animate-fade-up rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
                  <h3 className="font-semibold text-emerald-800">
                    Identitas kandidat terbuka
                  </h3>
                  <ul className="mt-3 space-y-2 text-emerald-900">
                    <li className="flex items-center gap-2.5">
                      <Icon name="user" className="h-4 w-4" />
                      {selected.candidate.name}
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icon name="mail" className="h-4 w-4" />
                      {selected.candidate.email}
                    </li>
                    {selected.candidate.phone && (
                      <li className="flex items-center gap-2.5">
                        <Icon name="phone" className="h-4 w-4" />
                        {selected.candidate.phone}
                      </li>
                    )}
                    {selected.candidate.portfolio_url && (
                      <li className="flex items-center gap-2.5">
                        <Icon name="link" className="h-4 w-4" />
                        {selected.candidate.portfolio_url}
                      </li>
                    )}
                  </ul>
                </section>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row">
              <button
                onClick={() => setStatus(selected.application.id, "shortlisted")}
                disabled={selected.application.status === "shortlisted"}
                className="btn-primary flex-1"
              >
                {selected.application.status === "shortlisted"
                  ? "Sudah di-shortlist"
                  : "Shortlist / undang wawancara"}
              </button>
              <button
                onClick={() => setStatus(selected.application.id, "rejected")}
                disabled={selected.application.status === "rejected"}
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
