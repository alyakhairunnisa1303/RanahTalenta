import { rankJobsForCv, type JobInput } from "./matchmaking";
import { shortlistTargetForOpenings } from "./policy";
import { mapWithConcurrency } from "./queue";
import {
  calculateSemanticMatch,
  validateAndRedactCV,
  type ServiceOptions,
} from "./scorer";
import type {
  JobShortlist,
  RejectedCandidate,
  SemanticMatchResult,
  ShortlistEntry,
  ShortlistResult,
} from "../types/contract";

export interface ShortlistJobInput extends JobInput {
  openings?: number;
}

export interface ShortlistCandidateInput {
  id?: string;
  cvText: string;
}

export interface ShortlistOptions {
  jobIds?: string[];
  topNPerCandidate?: number;
  minScore?: number;
  bufferRatio?: number;
  concurrency?: number;
  deepScan?: boolean;
  signal?: AbortSignal;
  onGeneration?: ServiceOptions["onGeneration"];
  generate?: ServiceOptions["generate"];
}

interface PreparedCandidate {
  candidateId: string;
  cvText: string;
  rejectReason: string | null;
}

interface ScoredPair {
  candidateId: string;
  job: ShortlistJobInput;
  match: SemanticMatchResult;
}

function resolveCandidateIds(
  candidates: ShortlistCandidateInput[],
): string[] {
  const used = new Set<string>();

  return candidates.map((candidate, index) => {
    const base =
      candidate.id?.trim() ||
      `candidate-${String(index + 1).padStart(3, "0")}`;

    let candidateId = base;
    let suffix = 2;
    while (used.has(candidateId)) {
      candidateId = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(candidateId);

    return candidateId;
  });
}

function bufferOverrideFor(
  openings: number,
  bufferRatio: number | undefined,
): number | undefined {
  if (bufferRatio === undefined) return undefined;
  const normalizedRatio = Math.max(0, bufferRatio);
  return Math.max(0, Math.ceil(openings * normalizedRatio));
}

function shortlistMessage(
  openings: number,
  buffer: number,
  target: number,
  selectedCount: number,
  candidateCount: number,
  minScore: number,
): string {
  if (selectedCount >= target) {
    return `Target terpenuhi: ${selectedCount}/${target} kandidat (${openings} posisi + ${buffer} buffer).`;
  }

  const shortfall = target - selectedCount;
  if (candidateCount === 0) {
    return `Belum ada kandidat dengan skor >= ${minScore}. Kurang ${shortfall} dari target ${target} (${openings} posisi + ${buffer} buffer).`;
  }

  return `Kurang ${shortfall} kandidat dari target ${target} (${openings} posisi + ${buffer} buffer). Pertimbangkan menurunkan minScore atau memperluas sourcing.`;
}

function toEntry(
  candidateId: string,
  match: SemanticMatchResult,
  rank: number,
  status: ShortlistEntry["status"],
): ShortlistEntry {
  return {
    candidate_id: candidateId,
    rank,
    status,
    match,
  };
}

export async function buildShortlist(
  jobs: ShortlistJobInput[],
  candidates: ShortlistCandidateInput[],
  options: ShortlistOptions = {},
): Promise<ShortlistResult> {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const minScore = Math.max(
    0,
    Math.min(100, Math.round(options.minScore ?? 60)),
  );
  const candidateIds = resolveCandidateIds(candidates);

  const prepared = await mapWithConcurrency(
    candidates,
    concurrency,
    async (candidate, index): Promise<PreparedCandidate> => {
      const candidateId = candidateIds[index] ?? `candidate-${index + 1}`;
      const validation = await validateAndRedactCV(candidate.cvText, {
        deepScan: options.deepScan,
        signal: options.signal,
        onGeneration: options.onGeneration,
        generate: options.generate,
      });

      if (!validation.is_valid_cv || !validation.redacted_cv.trim()) {
        return {
          candidateId,
          cvText: "",
          rejectReason:
            validation.reject_reason ?? "CV tidak terdeteksi sebagai CV yang sah.",
        };
      }

      return {
        candidateId,
        cvText: validation.redacted_cv,
        rejectReason: null,
      };
    },
  );

  const rejectedCandidates: RejectedCandidate[] = prepared
    .filter((candidate) => candidate.rejectReason !== null)
    .map((candidate) => ({
      candidate_id: candidate.candidateId,
      reason: candidate.rejectReason ?? "CV tidak valid.",
    }));
  const validCandidates = prepared.filter((candidate) => candidate.cvText);

  const uniqueJobs = Array.from(
    new Map(jobs.map((job) => [job.id, job])).values(),
  );
  const jobById = new Map(uniqueJobs.map((job) => [job.id, job]));
  const requestedJobIds = options.jobIds
    ? Array.from(new Set(options.jobIds))
    : undefined;
  const targetJobs = requestedJobIds
    ? requestedJobIds
        .map((jobId) => jobById.get(jobId))
        .filter((job): job is ShortlistJobInput => Boolean(job))
    : uniqueJobs;

  const pairs: Array<{
    candidateId: string;
    cvText: string;
    job: ShortlistJobInput;
  }> = [];

  if (requestedJobIds) {
    for (const candidate of validCandidates) {
      for (const job of targetJobs) {
        pairs.push({
          candidateId: candidate.candidateId,
          cvText: candidate.cvText,
          job,
        });
      }
    }
  } else {
    const rankedByCandidate = await mapWithConcurrency(
      validCandidates,
      concurrency,
      async (candidate) => ({
        candidate,
        ranked: await rankJobsForCv(candidate.cvText, targetJobs, {
          topN: options.topNPerCandidate ?? 5,
        }),
      }),
    );

    for (const { candidate, ranked } of rankedByCandidate) {
      for (const item of ranked) {
        pairs.push({
          candidateId: candidate.candidateId,
          cvText: candidate.cvText,
          job: item.job,
        });
      }
    }
  }

  const scoredPairs = await mapWithConcurrency(
    pairs,
    concurrency,
    async (pair): Promise<ScoredPair> => ({
      candidateId: pair.candidateId,
      job: pair.job,
      match: await calculateSemanticMatch(pair.cvText, pair.job.description, {
        jobTitle: pair.job.title,
        requirements: pair.job.requirements,
        deepScan: options.deepScan,
        signal: options.signal,
        onGeneration: options.onGeneration,
        generate: options.generate,
      }),
    }),
  );

  const matchesByJob = new Map<
    string,
    Array<{ candidateId: string; match: SemanticMatchResult }>
  >();
  for (const job of targetJobs) {
    matchesByJob.set(job.id, []);
  }

  for (const scored of scoredPairs) {
    if (scored.match.match_score < minScore) continue;
    matchesByJob.get(scored.job.id)?.push({
      candidateId: scored.candidateId,
      match: scored.match,
    });
  }

  const jobShortlists: JobShortlist[] = targetJobs.map((job) => {
    const entries = matchesByJob.get(job.id) ?? [];
    entries.sort(
      (first, second) =>
        second.match.match_score - first.match.match_score ||
        second.match.confidence - first.match.confidence ||
        first.candidateId.localeCompare(second.candidateId),
    );

    const openings = Math.max(1, Math.round(job.openings ?? 1));
    const capacity = shortlistTargetForOpenings(
      openings,
      bufferOverrideFor(openings, options.bufferRatio),
    );

    const selected = entries
      .slice(0, capacity.target)
      .map((entry, index) =>
        toEntry(entry.candidateId, entry.match, index + 1, "selected"),
      );
    const waitlist = entries
      .slice(capacity.target)
      .map((entry, index) =>
        toEntry(
          entry.candidateId,
          entry.match,
          capacity.target + index + 1,
          "waitlist",
        ),
      );

    return {
      job_id: job.id,
      title: job.title,
      openings: capacity.openings,
      buffer: capacity.buffer,
      target: capacity.target,
      selected,
      waitlist,
      shortfall: Math.max(0, capacity.target - selected.length),
      message: shortlistMessage(
        capacity.openings,
        capacity.buffer,
        capacity.target,
        selected.length,
        entries.length,
        minScore,
      ),
    };
  });

  return {
    jobs: jobShortlists,
    rejected_candidates: rejectedCandidates,
    generated_at: new Date().toISOString(),
  };
}
