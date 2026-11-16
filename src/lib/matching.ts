import { Prisma } from "@prisma/client";
import { z } from "zod";
import { anonymize } from "./anonymize";
import { mapWithConcurrency } from "./concurrency";
import { prisma } from "./db";
import { aiUnavailable, AppError } from "./errors";
import { extractMustHave } from "./keywords";
import { getScoreLabel } from "./label";
import { scoreCandidate } from "./scorer";
import type { ScoreOutput } from "./types";

const MAX_MATCH_JOBS = 10;
const MATCH_CONCURRENCY = 3;

const hrGapsSchema = z.object({
  missing: z.array(z.string()).default([]),
  celah: z.array(z.string()).default([]),
  sim: z.number().int().min(0).max(100).optional(),
  must_score: z.number().int().min(0).max(100).optional(),
  skor_kompetensi: z.number().int().min(0).max(100).optional(),
});

const strengthsSchema = z.array(
  z.object({
    poin: z.string(),
    bukti: z.string(),
  }),
);

const questionsSchema = z.array(z.string());

export type StoredHrGaps = z.infer<typeof hrGapsSchema>;

type MatchJsonFields = {
  matchScore: number;
  candidateFeedback: string;
  hrStrengths: Prisma.JsonValue;
  hrGaps: Prisma.JsonValue;
  interviewQuestions: Prisma.JsonValue;
};

export function readHrGaps(value: Prisma.JsonValue): StoredHrGaps {
  const parsed = hrGapsSchema.safeParse(value);
  return parsed.success ? parsed.data : { missing: [], celah: [] };
}

export function readStrengths(
  value: Prisma.JsonValue,
): { poin: string; bukti: string }[] {
  const parsed = strengthsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function readQuestions(value: Prisma.JsonValue): string[] {
  const parsed = questionsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function scoreDetailsFromMatch(match: MatchJsonFields) {
  const gaps = readHrGaps(match.hrGaps);

  return {
    total: match.matchScore,
    sim: gaps.sim ?? null,
    must_score: gaps.must_score ?? null,
    skor_kompetensi: gaps.skor_kompetensi ?? null,
    missing: gaps.missing,
    kekuatan: readStrengths(match.hrStrengths),
    celah: gaps.celah,
    candidate_feedback: match.candidateFeedback,
    pertanyaan_wawancara: readQuestions(match.interviewQuestions),
    label: getScoreLabel(match.matchScore),
  };
}

type JobForMatching = {
  id: number;
  title: string;
  description: string;
  requirements: string;
};

type MatchOutcome =
  | { job: JobForMatching; score: ScoreOutput }
  | { job: JobForMatching; error: unknown };

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export async function runMatchingForCandidate(
  candidateId: number,
  candidateName: string,
  cvText: string,
) {
  const cvAnon = anonymize(cvText, candidateName);
  const jobs = await prisma.job.findMany({
    where: { status: "open" },
    orderBy: { createdAt: "desc" },
    take: MAX_MATCH_JOBS,
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
    },
  });

  const outcomes = await mapWithConcurrency<JobForMatching, MatchOutcome>(
    jobs,
    MATCH_CONCURRENCY,
    async (job) => {
      try {
        const score = await scoreCandidate(
          `${job.title}\n${job.description}`,
          cvAnon,
          extractMustHave(job.requirements),
        );
        return { job, score };
      } catch (error) {
        console.error(
          `[MATCHING] Gagal menilai lowongan ${job.id}:`,
          error instanceof Error ? error.message : error,
        );
        return { job, error };
      }
    },
  );

  const successes = outcomes.filter(
    (outcome): outcome is { job: JobForMatching; score: ScoreOutput } =>
      "score" in outcome,
  );
  const failures = outcomes.filter(
    (outcome): outcome is { job: JobForMatching; error: unknown } =>
      "error" in outcome,
  );

  if (jobs.length > 0 && successes.length === 0 && failures.length > 0) {
    const firstError = failures[0].error;
    if (firstError instanceof AppError) {
      throw firstError;
    }
    throw aiUnavailable("Modul AI gagal menilai lowongan.");
  }

  for (const { job, score } of successes) {
    const data = {
      matchScore: score.total,
      candidateFeedback: score.candidateFeedback,
      hrStrengths: toJson(score.kekuatan),
      hrGaps: toJson({
        missing: score.missing,
        celah: score.celah,
        sim: score.sim,
        must_score: score.mustScore,
        skor_kompetensi: score.skor_kompetensi,
      }),
      interviewQuestions: toJson(score.pertanyaan_wawancara),
    };

    await prisma.jobMatch.upsert({
      where: {
        candidateId_jobId: {
          candidateId,
          jobId: job.id,
        },
      },
      create: {
        candidateId,
        jobId: job.id,
        ...data,
      },
      update: data,
    });
  }

  const openJobIds = jobs.map((job) => job.id);
  await prisma.jobMatch.deleteMany({
    where: {
      candidateId,
      ...(openJobIds.length > 0
        ? { jobId: { notIn: openJobIds } }
        : {}),
      application: { is: null },
    },
  });

  const matches = successes
    .map(({ job, score }) => ({
      job_id: job.id,
      title: job.title,
      match_score: score.total,
      label: getScoreLabel(score.total),
      ringkasan: score.candidateFeedback,
    }))
    .sort((a, b) => b.match_score - a.match_score);

  return {
    matches,
    failed_jobs: failures.map(({ job }) => ({
      job_id: job.id,
      title: job.title,
    })),
  };
}
