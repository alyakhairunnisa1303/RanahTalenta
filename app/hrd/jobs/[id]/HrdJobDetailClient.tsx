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
  getApplicantsForJob,
  getJob,
} from "@/src/data/mockData";
import { splitLines } from "@/src/lib/format";
import type {
  ApplicantRow,
  ApplicationStatus,
} from "@/src/types/hirematch";

export default function HrdJobDetailClient({ jobId }: { jobId: number }) {
  const job = getJob(jobId);

  const [rows, setRows] = useState<ApplicantRow[]>(() =>
    getApplicantsForJob(jobId)
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!job) {
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

  // Urut dari skor tertinggi ke terendah (ORDER BY match_score DESC)
  const sorted = [...rows].sort((a, b) => b.match.match_score - a.match.match_score);
  const selected = rows.find((r) => r.application.id === selectedId);

  // Kandidat yang direkomendasikan (Highly Recommended >= 80%)
  const recommendedCandidates = sorted.filter((r) => r.match.match_score >= 80);

  const high = recommendedCandidates.length;
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

  // Sistem Blind Screening Otomatis 100%:
  // Identitas HANYA terbuka secara otomatis ketika pelamar sudah diundang wawancara (shortlisted).
  // Tidak ada toggle/sakelar manual, sehingga seleksi awal murni tanpa bias.
  const isShortlisted = (r: ApplicantRow) => r.application.status === "shortlisted";
  const revealed = (r: ApplicantRow) => isShortlisted(r);

  function inviteCandidate(applicationId: number) {
    const target = rows.find((r) => r.application.id === applicationId);
    setStatus(applicationId, "shortlisted");
    if (target) {
      setToast(
        `Sukses mengundang ${target.candidate.name}! Informasi detail pelamar dan kontak resmi kini otomatis terbuka.`
      );
      setTimeout(() => setToast(null), 5000);
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8">
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
        subtitle={`${rows.length} pelamar terdaftar, diurutkan dari skor kecocokan kompetensi tertinggi.`}
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
      <div className="grid gap-8 lg:grid-cols-[1fr_390px]">
        {/* KOLOM KIRI: Leaderboard & Kontrol Blind Screening */}
        <div className="space-y-5">
          {/* Banner Sistem Blind Screening Otomatis (Tanpa Sakelar Manual) */}
          <div className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border-l-4 border-l-brand-600">
            <div className="flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name="shield" className="h-6 w-6" />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-ink-900">Sistem Blind Screening Otomatis</p>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    Otomatis Aktif
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 max-w-xl leading-relaxed">
                  Identitas pelamar disamarkan secara otomatis. Informasi detail (nama asli, nomor WhatsApp, email, dan portofolio) <b>baru akan terbuka otomatis ketika pelamar tersebut diundang wawancara</b>.
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
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
                  Daftar Pelamar ({sorted.length})
                </h2>
                <span className="text-xs text-slate-400">Klik baris untuk analisis AI lengkap</span>
              </div>

              {sorted.map((r, index) => {
                const sm = scoreMeta(r.match.match_score);
                const shortlisted = isShortlisted(r);

                return (
                  <div
                    key={r.application.id}
                    onClick={() => setSelectedId(r.application.id)}
                    className={`card flex w-full animate-fade-up flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${sm.accent}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <span className="w-5 text-center text-sm font-bold tabular-nums text-slate-400">
                        {index + 1}
                      </span>
                      <Avatar r={r} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-ink-900">{displayName(r)}</p>
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
                        </div>
                        <p className="truncate text-xs text-slate-500 mt-1">
                          {r.match.hr_strengths.join(" · ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                      <ScoreBadge score={r.match.match_score} />

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
                          className="btn-primary text-xs font-bold px-3 py-1.5 shadow-sm transition hover:scale-105"
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
        <aside className="space-y-6">
          {/* CARD 1: Requirement Lowongan */}
          <div className="card p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Lokasi: <b>{job.location}</b></span>
              <span>Gaji: <b>{job.salary_range ?? "—"}</b></span>
            </div>
          </div>

          {/* CARD 2: Detail Kandidat yang Direkomendasikan (Highly Recommended) */}
          <div className="card-bold p-5 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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
              Kandidat dengan skor $\ge 80\%$ yang paling memenuhi requirement posisi:
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
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-emerald-400"
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

            <div className="flex-1 space-y-6 overflow-y-auto p-6">
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

              <AiInsight title="Ringkasan Evaluasi AI">
                Skor kecocokan <b className="text-ink-900">{selected.match.match_score}%</b>{" "}
                ({scoreMeta(selected.match.match_score).label}) dengan{" "}
                {selected.match.hr_strengths.length} kekuatan utama terhadap requirement posisi.
              </AiInsight>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2.5} />
                  Kekuatan Utama Kandidat
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
                  Celah Kompetensi (Gaps)
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
              </section>

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
                disabled={isShortlisted(selected)}
                className={`flex-1 font-bold ${
                  isShortlisted(selected)
                    ? "bg-emerald-600 text-white cursor-default rounded-xl py-2.5"
                    : "btn-primary"
                }`}
              >
                {isShortlisted(selected)
                  ? "Sudah Diundang (Detail Terbuka)"
                  : "Undang Wawancara (Buka Identitas)"}
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
