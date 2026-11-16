import type { ApplicationStatus, Prisma } from "@prisma/client";
import { z } from "zod";
import { getScoreLabel } from "./label";
import {
  readHrGaps,
  readQuestions,
  readStrengths,
} from "./matching";

export const applicationDecisionSchema = z.object({
  status: z.enum(["shortlisted", "rejected"]),
});

type CandidateFields = {
  name: string;
  email: string;
  phone: string | null;
  portfolioUrl: string | null;
};

type MatchFields = {
  matchScore: number;
  candidateFeedback: string;
  hrStrengths: Prisma.JsonValue;
  hrGaps: Prisma.JsonValue;
  interviewQuestions: Prisma.JsonValue;
};

export type ApplicantRecord = {
  id: number;
  status: ApplicationStatus;
  appliedAt: Date;
  candidate: CandidateFields;
  jobMatch: MatchFields;
};

export type ApplicantDetailRecord = ApplicantRecord & {
  job: {
    id: number;
    title: string;
    hrdId: number;
  };
};

export function toCandidateIdentity(
  candidate: CandidateFields,
  status: ApplicationStatus,
) {
  if (status !== "shortlisted") {
    return null;
  }

  return {
    name: candidate.name,
    email: candidate.email,
    phone: candidate.phone,
    portfolio_url: candidate.portfolioUrl,
  };
}

export function toApplicantEntry(application: ApplicantRecord) {
  const candidate = toCandidateIdentity(
    application.candidate,
    application.status,
  );

  return {
    application_id: application.id,
    candidate_label: `Kandidat #${application.id}`,
    status: application.status,
    match_score: application.jobMatch.matchScore,
    score_label: getScoreLabel(application.jobMatch.matchScore),
    ringkasan: application.jobMatch.candidateFeedback,
    applied_at: application.appliedAt.toISOString(),
    ...(candidate ? { candidate } : {}),
  };
}

export function toApplicationDetail(application: ApplicantDetailRecord) {
  const gaps = readHrGaps(application.jobMatch.hrGaps);
  const candidate = toCandidateIdentity(
    application.candidate,
    application.status,
  );

  return {
    application_id: application.id,
    candidate_label: `Kandidat #${application.id}`,
    status: application.status,
    applied_at: application.appliedAt.toISOString(),
    ...(candidate ? { candidate } : {}),
    job: {
      id: application.job.id,
      title: application.job.title,
    },
    match_score: application.jobMatch.matchScore,
    score_label: getScoreLabel(application.jobMatch.matchScore),
    ringkasan: application.jobMatch.candidateFeedback,
    sim: gaps.sim ?? null,
    must_score: gaps.must_score ?? null,
    skor_kompetensi: gaps.skor_kompetensi ?? null,
    missing: gaps.missing,
    kekuatan: readStrengths(application.jobMatch.hrStrengths),
    celah: gaps.celah,
    candidate_feedback: application.jobMatch.candidateFeedback,
    pertanyaan_wawancara: readQuestions(
      application.jobMatch.interviewQuestions,
    ),
  };
}
