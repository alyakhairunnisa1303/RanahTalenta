import { cosineSimilarity, embedTextsCached } from "./embedding";
import { mapWithConcurrency } from "./queue";
import type { JobRequirements } from "./prompts";
import {
  calculateSemanticMatch,
  type ServiceOptions,
} from "./scorer";
import type { SemanticMatchResult } from "../types/contract";

export interface JobInput {
  id: string;
  title: string;
  description: string;
  requirements?: JobRequirements;
}

export interface RankedJob {
  job: JobInput;
  similarity: number;
}

export interface RankedMatch extends RankedJob {
  match: SemanticMatchResult;
}

export interface RankOptions {
  topN?: number;
}

export interface RankAndScoreOptions extends RankOptions, ServiceOptions {
  concurrency?: number;
}

function jobEmbeddingText(job: JobInput): string {
  return `${job.title}\n${job.description}`;
}

function clampTopN(topN: number | undefined, total: number): number {
  if (total === 0) return 0;
  const requested = topN ?? 5;
  return Math.min(Math.max(1, Math.round(requested)), total);
}

export async function rankJobsForCv(
  cvText: string,
  jobs: JobInput[],
  options: RankOptions = {},
): Promise<RankedJob[]> {
  if (jobs.length === 0) return [];

  const embeddings = await embedTextsCached([
    cvText,
    ...jobs.map(jobEmbeddingText),
  ]);
  const cvEmbedding = embeddings[0];

  if (!cvEmbedding) return [];

  const ranked = jobs.map((job, index) => {
    const jobEmbedding = embeddings[index + 1] ?? [];
    return {
      job,
      similarity: cosineSimilarity(cvEmbedding, jobEmbedding),
    };
  });

  ranked.sort((first, second) => second.similarity - first.similarity);

  return ranked.slice(0, clampTopN(options.topN, ranked.length));
}

export async function rankAndScoreJobs(
  cvText: string,
  jobs: JobInput[],
  options: RankAndScoreOptions = {},
): Promise<RankedMatch[]> {
  const ranked = await rankJobsForCv(cvText, jobs, options);
  const concurrency = options.concurrency ?? 3;

  return mapWithConcurrency(ranked, concurrency, async (item) => ({
    ...item,
    match: await calculateSemanticMatch(cvText, item.job.description, {
      onGeneration: options.onGeneration,
      jobTitle: item.job.title,
      requirements: item.job.requirements,
      deepScan: options.deepScan,
      signal: options.signal,
      generate: options.generate,
    }),
  }));
}
