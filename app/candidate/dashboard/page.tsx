"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ScoreBadge, {
  RECOMMENDATION_THRESHOLD,
  ScoreRing,
} from "../../../src/components/ScoreBadge";
import ApplyDialog from "../../../src/components/ApplyDialog";
import Icon from "../../../src/components/Icons";
import {
  AiInsight,
  AiPill,
  CountUp,
  Hero,
  HeroStat,
} from "../../../src/components/AiUi";
import { getUser } from "../../../src/data/mockData";
import { createApplication } from "../../../src/lib/application-client";
import { notifyDataChanged } from "../../../src/lib/client-events";
import { useCurrentUser } from "../../../src/lib/use-current-user";
import { useAllApplications } from "../../../src/lib/use-all-applications";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import type { JobMatch } from "../../../src/types/hirematch";
import type { ApplyFormValues } from "../../../src/components/ApplyDialog";

export default function CandidateDashboard() {
  const { user: candidate } = useCurrentUser();
  const candidateId = candidate?.id ?? 0;
  const allJobs = useAllJobs();
  const openJobs = useMemo(
    () => allJobs.filter((job) => job.status === "open"),
    [allJobs]
  );

  const [openId, setOpenId] = useState<number | null>(null);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [analysisAvailable, setAnalysisAvailable] = useState(false);
  const [applyTarget, setApplyTarget] = useState<JobMatch | null>(null);
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");
  const allApplications = useAllApplications();
  const applications = allApplications;

  useEffect(() => {
    if (!candidateId) return;
    const timer = window.setTimeout(() => {
      try {
        const cached = window.sessionStorage.getItem(`ranah-talenta:cv-analysis:${candidateId}`);
        if (!cached) return;
        const result = JSON.parse(cached) as { matches?: JobMatch[]; analyzed?: boolean };
        if (!Array.isArray(result.matches)) return;
        setMatches(result.matches);
        setAnalysisAvailable(Boolean(result.analyzed));
      } catch {
        setMatches([]);
        setAnalysisAvailable(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [candidateId]);

  const done = analysisAvailable;

  // One-click apply: hasil screening API dipakai langsung tanpa memanggil AI lagi.
  async function apply(match: JobMatch, values: ApplyFormValues) {
    if (applications.some((application) => application.job_id === match.job_id)) {
      return;
    }
    setApplySubmitting(true);
    setApplyError("");
    try {
      await createApplication(match, values);
      notifyDataChanged();
      setApplyTarget(null);
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Gagal mengirim lamaran.");
    } finally {
      setApplySubmitting(false);
    }
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-8">
      <Hero
        eyebrow="AI Job Matchmaker"
        title="Temukan peran yang paling cocok untuk Anda"
        subtitle="Ringkasan aktivitas karier dan rekomendasi lowongan yang cocok untuk Anda."
        action={<Link href="/candidate/applications" className="inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15">Lihat semua lamaran</Link>}
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

      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-ink-900">CV & Analisis AI</h2>
          <p className="mt-1 text-sm text-slate-500">Unggah CV, pantau proses screening, dan baca saran AI pada halaman analisis CV.</p>
        </div>
        <Link href="/candidate/cv-profile" className="btn-primary inline-flex shrink-0 items-center justify-center">Buka CV & Analisis AI</Link>
      </section>

          <div className="mt-6 space-y-4">
            {!done ? (
              <div className="card px-6 py-14 text-center">
                <Icon name="target" className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-3 font-semibold text-ink-900">Belum ada rekomendasi</p>
                <p className="mt-1 text-sm text-slate-500">
                  Unggah dan analisis CV melalui halaman CV & Analisis AI untuk melihat kecocokan lowongan.
                </p>
                <Link href="/candidate/cv-profile" className="mt-4 inline-flex font-semibold text-brand-700 hover:underline">Buka CV & Analisis AI →</Link>
              </div>
            ) : (
              <>
                {openJobs.length === 0 ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                    CV Anda sudah tersimpan. Rekomendasi akan muncul setelah ada lowongan aktif.
                  </div>
                ) : recommendedMatches.length === 0 && (
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
                const companyName = job.company_name ?? getUser(job.hrd_id)?.company_name;
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
                            {companyName}
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
      {applyTarget &&
        (() => {
          const job = allJobs.find((item) => item.id === applyTarget.job_id);
          if (!job) return null;
          return (
            <ApplyDialog
              job={job}
              candidate={candidate ?? undefined}
              match={applyTarget}
              submitting={applySubmitting}
              error={applyError}
              onClose={() => setApplyTarget(null)}
              onConfirm={(values) => {
                void apply(applyTarget, values);
              }}
            />
          );
        })()}
    </div>
  );
}
