import type { CvValidationResult, SemanticMatchResult, ScamCheckResult } from "../types/contract";
import type { Job, JobMatch } from "../types/hirematch";

const SCREEN_ENDPOINT = "/api/screen";

export type ScreeningDecision = "open" | "pending_review" | "blocked" | "verified";

export interface ScreenAudit {
  mode: string;
  model: string;
  promptVersion: string;
  [key: string]: unknown;
}

export interface ScamCheckResponse {
  status: "checked";
  result: ScamCheckResult;
  decision: ScreeningDecision;
  audit: ScreenAudit;
}

export interface RankedJobResult {
  job: { id: string; title: string; description: string };
  similarity: number;
  match: SemanticMatchResult;
}

export interface RankedCvResponse {
  status: "ranked";
  validation: CvValidationResult;
  results: RankedJobResult[];
  audit: ScreenAudit;
}

export interface ScoredCvResponse {
  status: "scored";
  validation: CvValidationResult;
  match: SemanticMatchResult;
  audit: ScreenAudit;
}

export interface RejectedCvResponse {
  status: "rejected";
  validation: CvValidationResult;
  audit: ScreenAudit;
}

export type CvScreenResponse = RankedCvResponse | ScoredCvResponse | RejectedCvResponse;

export class ScreenApiError extends Error {
  issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "ScreenApiError";
    this.issues = issues;
  }
}

async function postScreen<T>(body: BodyInit, headers?: HeadersInit): Promise<T> {
  const response = await fetch(SCREEN_ENDPOINT, {
    method: "POST",
    body,
    headers,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    issues?: Array<{ path: string; message: string }>;
  };

  if (!response.ok) {
    throw new ScreenApiError(
      payload.error ?? `Permintaan screening gagal (${response.status}).`,
      (payload.issues ?? []).map((issue) =>
        issue.path ? `${issue.path}: ${issue.message}` : issue.message
      )
    );
  }

  return payload as T;
}

function postJson<T>(data: unknown): Promise<T> {
  return postScreen<T>(JSON.stringify(data), { "content-type": "application/json" });
}

export function jobDescriptionForScreening(job: Job): string {
  return `${job.title}\n${job.description}\n\nKualifikasi:\n${job.requirements}`.trim();
}

function toJobInput(job: Job) {
  return {
    id: String(job.id),
    title: job.title,
    description: jobDescriptionForScreening(job),
  };
}

export function checkCompany(companyName: string, hrdEmail: string) {
  return postJson<ScamCheckResponse>({
    action: "company",
    companyName,
    hrdEmail,
  });
}

export function checkJob(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string
) {
  return postJson<ScamCheckResponse>({
    action: "job",
    companyName,
    hrdEmail,
    jobTitle,
    jobDescription,
  });
}

export function screenCvWithJobs(cvText: string, jobs: Job[]): Promise<CvScreenResponse> {
  return postJson<CvScreenResponse>({
    action: "cv",
    cvText,
    jobs: jobs.map(toJobInput),
    topN: Math.min(Math.max(jobs.length, 1), 20),
  });
}

export function screenCvFileWithJobs(file: File, jobs: Job[]): Promise<CvScreenResponse> {
  const form = new FormData();
  form.set("action", "cv");
  form.set("file", file);
  form.set("jobs", JSON.stringify(jobs.map(toJobInput)));
  form.set("topN", String(Math.min(Math.max(jobs.length, 1), 20)));
  return postScreen<CvScreenResponse>(form);
}

export function screenCvAgainstJob(
  cvText: string,
  job: Job,
  companyName?: string,
  hrdEmail?: string
): Promise<CvScreenResponse> {
  return postJson<CvScreenResponse>({
    action: "cv",
    cvText,
    jobDescription: jobDescriptionForScreening(job),
    jobTitle: job.title,
    companyName,
    hrdEmail,
  });
}

function splitToItems(text: string, maxItems = 6): string[] {
  return text
    .split(/\n|;|·|,(?=\s)/)
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

export function toJobMatch(
  jobId: number,
  candidateId: number,
  match: SemanticMatchResult,
  id = jobId
): JobMatch {
  return {
    id,
    candidate_id: candidateId,
    job_id: jobId,
    match_score: match.match_score,
    candidate_feedback: match.candidate_feedback,
    hr_strengths:
      match.matched_skills.length > 0
        ? match.matched_skills
        : splitToItems(match.hr_strengths),
    hr_gaps:
      match.missing_skills.length > 0
        ? match.missing_skills
        : splitToItems(match.hr_gaps),
    interview_questions: match.interview_questions,
    created_at: new Date().toISOString().slice(0, 10),
  };
}
