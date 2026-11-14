"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ScoreBadge, {
  RECOMMENDATION_THRESHOLD,
  ScoreRing,
} from "../../../src/components/ScoreBadge";
import ApplyDialog from "../../../src/components/ApplyDialog";
import { CompanyAvatar } from "../../../src/components/JobCard";
import Icon from "../../../src/components/Icons";
import {
  AiInsight,
  AiPill,
  CountUp,
  Hero,
  HeroStat,
} from "../../../src/components/AiUi";
import {
  CURRENT_CANDIDATE_ID,
  applicationStatusMeta,
  getUser,
} from "../../../src/data/mockData";
import { formatDate } from "../../../src/lib/format";
import {
  getCandidateCv,
  nextApplicationId,
  saveCandidateCv,
  upsertApplication,
} from "../../../src/lib/local-store";
import {
  screenCvFileWithJobs,
  screenCvWithJobs,
  toJobMatch,
} from "../../../src/lib/screen-client";
import { useAllApplications } from "../../../src/lib/use-all-applications";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import type { Application, JobMatch } from "../../../src/types/hirematch";

const STAGES = [
  "Mengekstrak teks dari PDF",
  "AI memeriksa keaslian CV",
  "Menyensor data pribadi (bias-redaction)",
  "AI mencocokkan dengan semua lowongan",
];

const DOC_LINES = ["w-3/4", "w-full", "w-5/6", "w-2/3", "w-full", "w-4/5", "w-1/2", "w-5/6"];

type Tab = "matches" | "applications";

export default function CandidateDashboard() {
  const candidate = getUser(CURRENT_CANDIDATE_ID);
  const allJobs = useAllJobs();
  const openJobs = useMemo(
    () => allJobs.filter((job) => job.status === "open"),
    [allJobs]
  );

  const [tab, setTab] = useState<Tab>("matches");
  const [stage, setStage] = useState(-1); // -1 idle, 0..3 proses, 4 selesai
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [ready, setReady] = useState(false);
  const [auditMode, setAuditMode] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<JobMatch | null>(null);
  const allApplications = useAllApplications();
  const applications = useMemo(
    () =>
      allApplications.filter(
        (application) => application.candidate_id === CURRENT_CANDIDATE_ID
      ),
    [allApplications]
  );
  const lastScreenedCv = useRef<string | null>(null);

  const done = ready;
  const processing = stage >= 0 && !done;

  // Jika pelamar sudah punya CV tersimpan, skor ulang otomatis lewat API.
  useEffect(() => {
    const storedCv = getCandidateCv();
    if (!storedCv || lastScreenedCv.current === storedCv) return;
    lastScreenedCv.current = storedCv;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setFileName("CV tersimpan");
      setStage(0);
    });

    screenCvWithJobs(storedCv, openJobs)
      .then((response) => {
        if (cancelled) return;
        if (response.status === "ranked") {
          saveCandidateCv(response.validation.redacted_cv);
          setMatches(
            response.results.map((result) =>
              toJobMatch(
                Number(result.job.id),
                CURRENT_CANDIDATE_ID,
                result.match
              )
            )
          );
          setAuditMode(response.audit.mode);
          setReady(true);
          setStage(STAGES.length);
          return;
        }
        if (response.status === "rejected") {
          setError(
            response.validation.reject_reason ??
              "CV tersimpan tidak terdeteksi sebagai CV yang sah."
          );
        }
        setStage(-1);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Gagal menganalisis CV tersimpan."
        );
        setStage(-1);
      });

    return () => {
      cancelled = true;
    };
  }, [openJobs]);

  async function handleFile(file?: File) {
    setError("");
    if (!file) return;
    if (
      !/\.(pdf|docx|txt)$/i.test(file.name) &&
      !["application/pdf", "text/plain"].includes(file.type)
    ) {
      setError("File harus berformat PDF, DOCX, atau TXT.");
      return;
    }

    setFileName(file.name);
    setStage(0);
    setReady(false);
    setMatches([]);
    setAuditMode(null);

    const timer = window.setInterval(() => {
      setStage((current) =>
        current < STAGES.length - 1 ? current + 1 : current
      );
    }, 700);

    try {
      const response = await screenCvFileWithJobs(file, openJobs);
      if (response.status === "rejected") {
        setError(
          response.validation.reject_reason ??
            "AI Authenticity Check: dokumen tidak terdeteksi sebagai CV/resume yang sah."
        );
        setStage(-1);
        return;
      }
      if (response.status !== "ranked") {
        setError("Respons screening tidak dikenali.");
        setStage(-1);
        return;
      }

      saveCandidateCv(response.validation.redacted_cv);
      setMatches(
        response.results.map((result) =>
          toJobMatch(Number(result.job.id), CURRENT_CANDIDATE_ID, result.match)
        )
      );
      setAuditMode(response.audit.mode);
      setReady(true);
      setStage(STAGES.length);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal menganalisis CV."
      );
      setStage(-1);
    } finally {
      window.clearInterval(timer);
    }
  }

  // One-click apply: hasil screening API dipakai langsung tanpa memanggil AI lagi.
  function apply(match: JobMatch) {
    if (applications.some((application) => application.job_id === match.job_id)) {
      return;
    }
    const application: Application = {
      id: nextApplicationId(),
      job_match_id: match.id,
      candidate_id: CURRENT_CANDIDATE_ID,
      job_id: match.job_id,
      status: "pending",
      applied_at: new Date().toISOString().slice(0, 10),
    };
    upsertApplication(application);
  }

  const appliedJobIds = applications.map((a) => a.job_id);

  const myMatches = matches
    .filter((match) =>
      openJobs.some((job) => job.id === match.job_id)
    )
    .sort((a, b) => b.match_score - a.match_score);

  const recommendedMatches = myMatches.filter(
    (match) => match.match_score >= RECOMMENDATION_THRESHOLD
  );
  const bestScore = recommendedMatches[0]?.match_score ?? 0;

  const tabs: [Tab, string][] = [
    ["matches", "Rekomendasi lowongan"],
    ["applications", `Status lamaran (${applications.length})`],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <Hero
        eyebrow="AI Job Matchmaker"
        title="Temukan peran yang paling cocok untuk Anda"
        subtitle="Unggah CV sekali, AI mencocokkannya dengan semua lowongan terbuka lalu memberi masukan agar profil Anda lebih kuat."
      >
        <HeroStat label="Rekomendasi lowongan" icon="target">
          {done ? <CountUp value={recommendedMatches.length} /> : "—"}
        </HeroStat>
        <HeroStat label="Skor kecocokan tertinggi" icon="trending">
          {done ? (
            <>
              <CountUp value={bestScore} />%
            </>
          ) : (
            "—"
          )}
        </HeroStat>
        <HeroStat label="Lamaran terkirim" icon="briefcase">
          <CountUp value={applications.length} />
        </HeroStat>
      </Hero>

      {/* Smart CV Uploader */}
      <section className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name="file" className="h-4 w-4" />
            </span>
            <h2 className="font-semibold text-ink-900">Smart CV Uploader</h2>
          </div>
          {done && (
            <button
              onClick={() => {
                setStage(-1);
                setReady(false);
                setMatches([]);
                setFileName("");
                setAuditMode(null);
              }}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Ganti CV
            </button>
          )}
        </div>

        {!processing && !done && (
          <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white px-4 py-12 text-center transition hover:border-brand-500 hover:bg-brand-50/50">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-lg shadow-brand-600/25">
              <Icon name="upload" className="h-7 w-7" />
            </span>
            <span className="mt-4 text-sm font-semibold text-ink-900">
              Klik untuk mengunggah CV (PDF / DOCX / TXT)
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Diproses langsung oleh pipeline AI; data pribadi otomatis disamarkan.
            </span>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
        )}

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-red-600">
            <Icon name="alert" className="h-4 w-4" />
            {error}
          </p>
        )}

        {processing && (
          <div className="mt-5 grid gap-6 md:grid-cols-[200px_1fr]">
            {/* Dokumen yang sedang dipindai */}
            <div className="relative mx-auto h-60 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 h-3 w-1/2 rounded bg-slate-300" />
              <div className="space-y-2.5">
                {DOC_LINES.map((w, i) => (
                  <div key={i} className={`h-2 rounded bg-slate-200 ${w}`} />
                ))}
              </div>
              <div className="absolute inset-x-0 h-12 animate-scan border-b-2 border-brand-500 bg-gradient-to-b from-transparent to-brand-500/25" />
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Icon name="file" className="h-4 w-4 text-slate-400" />
                {fileName}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 via-sky-400 to-accent-400 transition-all duration-700"
                  style={{ width: `${(stage / STAGES.length) * 100}%` }}
                />
              </div>
              <ol className="mt-5 space-y-3.5">
                {STAGES.map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        i < stage
                          ? "bg-emerald-500 text-white"
                          : i === stage
                          ? "animate-pulse bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {i < stage ? (
                        <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span
                      className={
                        i <= stage ? "font-medium text-ink-900" : "text-slate-400"
                      }
                    >
                      {label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {done && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">
            <Icon name="check" className="h-5 w-5 shrink-0" strokeWidth={2.5} />
            <span>
              CV <b>{fileName}</b> berhasil dianalisis oleh pipeline AI
              {auditMode ? ` (mode: ${auditMode})` : ""}.{" "}
              {recommendedMatches.length > 0
                ? `${recommendedMatches.length} lowongan direkomendasikan.`
                : `Belum ada lowongan yang mencapai skor rekomendasi minimal ${RECOMMENDATION_THRESHOLD}%.`}
            </span>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-slate-200">
          {tabs.map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                tab === value
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-ink-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "matches" && (
          <div className="mt-6 space-y-4">
            {!done ? (
              <div className="card px-6 py-14 text-center">
                <Icon name="target" className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-semibold text-ink-900">Belum ada rekomendasi</p>
                <p className="mt-1 text-sm text-slate-500">
                  Unggah CV Anda untuk melihat lowongan berdasarkan skor kecocokan AI.
                </p>
              </div>
            ) : (
              <>
                {recommendedMatches.length === 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <p className="font-semibold">Belum ada rekomendasi kuat</p>
                    <p className="mt-1">
                      Skor tertinggi{" "}
                      <b>{myMatches[0]?.match_score ?? 0}%</b>, di bawah batas
                      rekomendasi {RECOMMENDATION_THRESHOLD}%. Perkuat CV pada
                      skill yang diminta lowongan lalu unggah ulang.
                    </p>
                  </div>
                )}
                {myMatches.map((m, i) => {
                const job = allJobs.find((item) => item.id === m.job_id);
                if (!job) return null;
                const company = getUser(job.hrd_id);
                const applied = appliedJobIds.includes(m.job_id);
                const open = openId === m.id;
                const best =
                  i === 0 && m.match_score >= RECOMMENDATION_THRESHOLD;
                return (
                  <div
                    key={m.id}
                    className={`${best ? "ai-card" : "card"} animate-fade-up overflow-hidden`}
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                      <ScoreRing score={m.match_score} size={64} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/candidate/jobs/${job.id}`}
                            className="font-semibold text-ink-900 hover:text-brand-700"
                          >
                            {job.title}
                          </Link>
                          {best && <AiPill>Kecocokan terbaik</AiPill>}
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="building" className="h-3.5 w-3.5" />
                            {company?.company_name}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name="pin" className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <ScoreBadge score={m.match_score} showLabel={false} />
                        <button
                          onClick={() => setApplyTarget(m)}
                          disabled={applied}
                          className="btn-primary btn-sm"
                        >
                          {applied ? "Sudah dilamar" : "Lamar"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setOpenId(open ? null : m.id)}
                      className="flex w-full items-center justify-between border-t border-slate-100 px-5 py-3 text-sm font-medium text-brand-700 transition hover:bg-slate-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon name="sparkles" className="h-4 w-4" />
                        AI Resume Feedback
                      </span>
                      <Icon
                        name="chevronDown"
                        className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>

                    {open && (
                      <div className="animate-fade-in space-y-4 border-t border-slate-100 bg-slate-50 p-5">
                        <AiInsight title="Saran perbaikan CV">
                          {m.candidate_feedback}
                        </AiInsight>
                        <div className="flex flex-wrap gap-2">
                          {m.hr_strengths.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"
                            >
                              <Icon name="check" className="h-3 w-3" strokeWidth={2.5} />
                              {s}
                            </span>
                          ))}
                          {m.hr_gaps.map((g) => (
                            <span
                              key={g}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"
                            >
                              <Icon name="alert" className="h-3 w-3" />
                              Kurang: {g}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </>
            )}
          </div>
        )}

        {tab === "applications" && (
          <div className="mt-6 space-y-3">
            {applications.length === 0 ? (
              <div className="card px-6 py-14 text-center">
                <Icon name="briefcase" className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-semibold text-ink-900">Belum ada lamaran</p>
              </div>
            ) : (
              applications.map((a, i) => {
                const job = allJobs.find((item) => item.id === a.job_id);
                if (!job) return null;
                const company = getUser(job.hrd_id);
                const meta = applicationStatusMeta[a.status];
                return (
                  <div
                    key={a.id}
                    className="card flex animate-fade-up items-center gap-4 p-4"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <CompanyAvatar name={company?.company_name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{job.title}</p>
                      <p className="text-sm text-slate-500">
                        {company?.company_name} · dilamar {formatDate(a.applied_at)}
                      </p>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {applyTarget &&
        (() => {
          const job = allJobs.find((item) => item.id === applyTarget.job_id);
          if (!job) return null;
          return (
            <ApplyDialog
              job={job}
              candidate={candidate}
              match={applyTarget}
              onClose={() => setApplyTarget(null)}
              onConfirm={() => {
                apply(applyTarget);
                setApplyTarget(null);
              }}
            />
          );
        })()}
    </div>
  );
}