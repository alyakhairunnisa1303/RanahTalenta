import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createAuditMeta, type GenerationMeta } from "./audit";
import { generateJsonResult } from "./gemini";
import {
  DocumentExtractionError,
  MAX_DOCUMENT_BYTES,
  extractTextFromBuffer,
} from "./extract";
import {
  rankAndScoreJobs,
  type JobInput,
  type RankedMatch,
} from "./matchmaking";
import {
  companyDecisionForRisk,
  jobDecisionForRisk,
} from "./policy";
import { PROMPT_VERSION } from "./prompts";
import {
  calculateSemanticMatch,
  checkCompanyScam,
  checkJobScam,
  validateAndRedactCV,
} from "./scoring";
import {
  checkRateLimit,
  clientKey,
  isAuthorized,
  rateLimitHeaders,
  screenRateLimitPerMinute,
} from "./security";
import {
  buildShortlist,
  type ShortlistCandidateInput,
  type ShortlistJobInput,
} from "./shortlist";
import type {
  CvValidationResult,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

const companyFields = {
  companyName: z.string().trim().min(1).max(200),
  hrdEmail: z.string().trim().email().max(320),
};

const jobFields = {
  ...companyFields,
  jobTitle: z.string().trim().min(1).max(200),
  jobDescription: z.string().trim().min(20).max(20_000),
};

const requirementsSchema = z
  .object({
    mustHave: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
    niceToHave: z.array(z.string().trim().min(1).max(200)).max(50).optional(),
  })
  .optional();

const jobInputSchema = z.object({
  id: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().min(20).max(20_000),
  openings: z.number().int().min(1).max(10_000).optional(),
  requirements: requirementsSchema,
});

const cvTargetFields = {
  jobDescription: z.string().trim().min(20).max(20_000).optional(),
  jobs: z.array(jobInputSchema).max(200).optional(),
  topN: z.number().int().min(1).max(20).default(5),
  jobTitle: z.string().trim().max(200).optional(),
  companyName: z.string().trim().max(200).optional(),
  hrdEmail: z.string().trim().email().max(320).optional(),
  deepScan: z.boolean().default(false),
};

type CvTarget = {
  jobDescription?: string;
  jobs?: JobInput[];
  deepScan?: boolean;
};

const companyRequestSchema = z.object({
  action: z.literal("company"),
  ...companyFields,
});

const jobRequestSchema = z.object({
  action: z.literal("job"),
  ...jobFields,
});

const cvBaseSchema = z.object(cvTargetFields);

const cvJsonRequestSchema = z
  .object({
    action: z.literal("cv"),
    cvText: z.string().min(40).max(30_000),
    ...cvTargetFields,
  });

const MAX_SHORTLIST_PAIRS = 2_000;

const shortlistCandidateSchema = z.object({
  id: z.string().trim().min(1).max(200).optional(),
  cvText: z.string().min(40).max(30_000),
});

const shortlistFields = {
  jobs: z.array(jobInputSchema).min(1).max(200),
  jobIds: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(200)
    .optional(),
  topNPerCandidate: z.number().int().min(1).max(20).default(5),
  minScore: z.number().int().min(0).max(100).default(60),
  bufferRatio: z.number().min(0).max(2).optional(),
  deepScan: z.boolean().default(false),
};

function estimatedShortlistPairs(data: {
  jobs: unknown[];
  jobIds?: string[];
  topNPerCandidate: number;
}): number {
  const jobsPerCandidate =
    data.jobIds?.length ??
    Math.min(data.topNPerCandidate, data.jobs.length);
  return jobsPerCandidate;
}

const shortlistRequestSchema = z
  .object({
    action: z.literal("shortlist"),
    candidates: z.array(shortlistCandidateSchema).min(1).max(300),
    ...shortlistFields,
  })
  .refine(
    (data) =>
      data.candidates.length * estimatedShortlistPairs(data) <=
      MAX_SHORTLIST_PAIRS,
    {
      message: `Maksimal ${MAX_SHORTLIST_PAIRS} pasangan kandidat-lowongan per permintaan.`,
      path: ["candidates"],
    },
  );

const shortlistFormSchema = z.object({
  jobs: z.array(jobInputSchema).min(1).max(200),
  jobIds: z
    .array(z.string().trim().min(1).max(200))
    .min(1)
    .max(200)
    .optional(),
  topNPerCandidate: z.number().int().min(1).max(20).default(5),
  minScore: z.number().int().min(0).max(100).default(60),
  bufferRatio: z.number().min(0).max(2).optional(),
  deepScan: z.boolean().default(false),
  candidateIds: z
    .array(z.string().trim().min(1).max(200))
    .max(300)
    .optional(),
});

export interface CvSourceInfo {
  filename: string;
  mimeType: string;
  pageCount?: number;
  charCount: number;
}

interface CvScreeningInput extends CvTarget {
  cvText: string;
  topN: number;
  jobTitle?: string;
  companyName?: string;
  hrdEmail?: string;
  source?: CvSourceInfo;
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function withRequestId(response: Response, requestId: string): Response {
  response.headers.set("x-request-id", requestId);
  return response;
}

function validationError(error: z.ZodError): Response {
  return jsonResponse(
    {
      error: "Input tidak valid.",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    },
    400,
  );
}

function parseJobsField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value.trim() === "") return undefined;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseNumberField(
  value: FormDataEntryValue | null,
  fallback: number,
): number {
  if (typeof value !== "string" || value.trim() === "") return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalNumberField(
  value: FormDataEntryValue | null,
): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseBooleanField(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseTopN(value: FormDataEntryValue | null): number {
  return parseNumberField(value, 5);
}

function optionalFormString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

async function runCompanyCheck(
  companyName: string,
  hrdEmail: string,
  requestId: string,
): Promise<Response> {
  const generations: GenerationMeta[] = [];
  const result = await checkCompanyScam(companyName, hrdEmail, {
    onGeneration: (meta) => generations.push(meta),
  });

  return jsonResponse({
    status: "checked",
    result,
    decision: companyDecisionForRisk(result.risk_level),
    audit: createAuditMeta(
      { action: "company", companyName, hrdEmail },
      generations,
      requestId,
    ),
  });
}

async function runJobCheck(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
  requestId: string,
): Promise<Response> {
  const generations: GenerationMeta[] = [];
  const result = await checkJobScam(
    companyName,
    hrdEmail,
    jobTitle,
    jobDescription,
    { onGeneration: (meta) => generations.push(meta) },
  );

  return jsonResponse({
    status: "checked",
    result,
    decision: jobDecisionForRisk(result.risk_level),
    audit: createAuditMeta(
      { action: "job", companyName, hrdEmail, jobTitle, jobDescription },
      generations,
      requestId,
    ),
  });
}

interface ShortlistRunInput {
  jobs: ShortlistJobInput[];
  candidates: ShortlistCandidateInput[];
  jobIds?: string[];
  topNPerCandidate: number;
  minScore: number;
  bufferRatio?: number;
  deepScan: boolean;
}

async function runShortlist(
  input: ShortlistRunInput,
  requestId: string,
): Promise<Response> {
  if (input.jobIds) {
    const knownJobIds = new Set(input.jobs.map((job) => job.id));
    const missingJobIds = input.jobIds.filter(
      (jobId) => !knownJobIds.has(jobId),
    );
    if (missingJobIds.length > 0) {
      return jsonResponse(
        {
          error: `jobIds tidak ditemukan pada jobs: ${missingJobIds.join(", ")}`,
        },
        400,
      );
    }
  }

  const generations: GenerationMeta[] = [];
  const result = await buildShortlist(input.jobs, input.candidates, {
    jobIds: input.jobIds,
    topNPerCandidate: input.topNPerCandidate,
    minScore: input.minScore,
    bufferRatio: input.bufferRatio,
    deepScan: input.deepScan,
    onGeneration: (meta) => generations.push(meta),
  });

  return jsonResponse({
    status: "shortlisted",
    result,
    audit: createAuditMeta(
      {
        action: "shortlist",
        jobIds: input.jobIds,
        jobs: input.jobs.map((job) => ({
          id: job.id,
          title: job.title,
          openings: job.openings ?? 1,
          requirements: job.requirements ?? null,
        })),
        candidateIds: input.candidates
          .map((candidate) => candidate.id)
          .filter((id): id is string => Boolean(id)),
        candidateCount: input.candidates.length,
        topNPerCandidate: input.topNPerCandidate,
        minScore: input.minScore,
        bufferRatio: input.bufferRatio,
        deepScan: input.deepScan,
      },
      generations,
      requestId,
    ),
  });
}

async function runCvScreening(
  input: CvScreeningInput,
  requestId: string,
  onProgress?: (step: number) => Promise<void>,
  requireLiveGemini = false,
): Promise<Response> {
  const generations: GenerationMeta[] = [];
  const onGeneration = (meta: GenerationMeta) => generations.push(meta);

  await onProgress?.(1);
  const validation = await validateAndRedactCV(input.cvText, {
    onGeneration,
    deepScan: input.deepScan || requireLiveGemini,
    forceRealGemini: requireLiveGemini,
  });
  await onProgress?.(2);

  const auditBase = {
    action: "cv",
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    hrdEmail: input.hrdEmail,
    source: input.source,
    jobDescription: input.jobDescription,
    jobs: input.jobs,
    topN: input.topN,
    deepScan: input.deepScan,
  };

  if (!validation.is_valid_cv) {
    return jsonResponse({
      status: "rejected",
      validation,
      audit: createAuditMeta(
        { ...auditBase, cvText: "", reject_reason: validation.reject_reason },
        generations,
        requestId,
      ),
    });
  }

  if (!input.jobs?.length && !input.jobDescription) {
    return jsonResponse({
      status: "validated",
      validation,
      audit: createAuditMeta(
        { ...auditBase, cvText: validation.redacted_cv },
        generations,
        requestId,
      ),
    });
  }

  if (input.jobs?.length) {
    const scoringGenerationStart = generations.length;
    const results: RankedMatch[] = await rankAndScoreJobs(
      validation.redacted_cv,
      input.jobs,
      {
        topN: input.topN,
        onGeneration,
        deepScan: input.deepScan,
        forceRealGemini: requireLiveGemini,
        ...(requireLiveGemini ? { generate: generateJsonResult } : {}),
      },
    );
    if (
      requireLiveGemini &&
      generations.slice(scoringGenerationStart).some((generation) => generation.mode !== "gemini")
    ) {
      throw new Error("Analisis Gemini gagal. Hasil mock tidak disimpan sebagai hasil screening.");
    }

    return jsonResponse({
      status: "ranked",
      validation,
      results,
      audit: createAuditMeta(
        { ...auditBase, cvText: validation.redacted_cv },
        generations,
        requestId,
      ),
    });
  }

  await onProgress?.(3);
  const match: SemanticMatchResult = await calculateSemanticMatch(
    validation.redacted_cv,
    input.jobDescription!,
    {
      onGeneration,
      jobTitle: input.jobTitle,
      deepScan: input.deepScan || requireLiveGemini,
      forceRealGemini: requireLiveGemini,
      ...(requireLiveGemini ? { generate: generateJsonResult } : {}),
    },
  );
  const scoringGeneration = generations.at(-1);
  if (requireLiveGemini && scoringGeneration?.mode !== "gemini") {
    const reason = scoringGeneration?.fallbackReason ?? scoringGeneration?.mode ?? "unknown";
    throw new Error(`Analisis Gemini gagal (${reason}). Hasil mock tidak disimpan sebagai hasil screening.`);
  }
  await onProgress?.(4);

  return jsonResponse({
    status: "scored",
    validation,
    match,
    audit: createAuditMeta(
      { ...auditBase, cvText: validation.redacted_cv },
      generations,
      requestId,
    ),
  });
}

async function handleMultipart(
  request: Request,
  requestId: string,
): Promise<Response> {
  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "Form data tidak valid." }, 400);
  }

  const action = String(form.get("action") ?? "cv").trim();

  if (action === "company") {
    const parsed = companyRequestSchema.safeParse({
      action,
      companyName: String(form.get("companyName") ?? ""),
      hrdEmail: String(form.get("hrdEmail") ?? ""),
    });
    if (!parsed.success) return validationError(parsed.error);

    return runCompanyCheck(
      parsed.data.companyName,
      parsed.data.hrdEmail,
      requestId,
    );
  }

  if (action === "job") {
    const parsed = jobRequestSchema.safeParse({
      action,
      companyName: String(form.get("companyName") ?? ""),
      hrdEmail: String(form.get("hrdEmail") ?? ""),
      jobTitle: String(form.get("jobTitle") ?? ""),
      jobDescription: String(form.get("jobDescription") ?? ""),
    });
    if (!parsed.success) return validationError(parsed.error);

    return runJobCheck(
      parsed.data.companyName,
      parsed.data.hrdEmail,
      parsed.data.jobTitle,
      parsed.data.jobDescription,
      requestId,
    );
  }

  if (action === "shortlist") {
    const jobIds = parseJobsField(form.get("jobIds"));
    const candidateIds = parseJobsField(form.get("candidateIds"));
    const parsed = shortlistFormSchema.safeParse({
      jobs: parseJobsField(form.get("jobs")),
      jobIds,
      topNPerCandidate: parseNumberField(form.get("topNPerCandidate"), 5),
      minScore: parseNumberField(form.get("minScore"), 60),
      bufferRatio: parseOptionalNumberField(form.get("bufferRatio")),
      deepScan: parseBooleanField(form.get("deepScan")),
      candidateIds,
    });
    if (!parsed.success) return validationError(parsed.error);

    const files = form
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File);
    if (files.length === 0) {
      return jsonResponse(
        { error: "Field files wajib berisi minimal satu dokumen." },
        400,
      );
    }
    if (files.length > 300) {
      return jsonResponse(
        { error: "Maksimal 300 dokumen per permintaan shortlist." },
        400,
      );
    }

    if (
      parsed.data.candidateIds &&
      parsed.data.candidateIds.length !== files.length
    ) {
      return jsonResponse(
        {
          error:
            "Jumlah candidateIds harus sama dengan jumlah file shortlist.",
        },
        400,
      );
    }

    const jobsPerCandidate =
      parsed.data.jobIds?.length ??
      Math.min(parsed.data.topNPerCandidate, parsed.data.jobs.length);
    if (files.length * jobsPerCandidate > MAX_SHORTLIST_PAIRS) {
      return jsonResponse(
        {
          error: `Maksimal ${MAX_SHORTLIST_PAIRS} pasangan kandidat-lowongan per permintaan.`,
        },
        400,
      );
    }

    const candidates: ShortlistCandidateInput[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]!;
      const candidateId = parsed.data.candidateIds?.[index];
      if (file.size > MAX_DOCUMENT_BYTES) {
        return jsonResponse(
          { error: `Ukuran file ${file.name} melebihi batas 8 MB.` },
          413,
        );
      }

      if (file.size === 0) {
        candidates.push({ id: candidateId, cvText: "" });
        continue;
      }

      try {
        const extraction = await extractTextFromBuffer(
          Buffer.from(await file.arrayBuffer()),
          file.type,
          file.name,
        );
        candidates.push({ id: candidateId, cvText: extraction.text });
      } catch (error) {
        if (!(error instanceof DocumentExtractionError)) throw error;
        candidates.push({ id: candidateId, cvText: "" });
      }
    }

    return runShortlist(
      {
        jobs: parsed.data.jobs,
        candidates,
        jobIds: parsed.data.jobIds,
        topNPerCandidate: parsed.data.topNPerCandidate,
        minScore: parsed.data.minScore,
        bufferRatio: parsed.data.bufferRatio,
        deepScan: parsed.data.deepScan,
      },
      requestId,
    );
  }

  if (action !== "cv") {
    return jsonResponse(
      { error: "action harus company, job, cv, atau shortlist." },
      400,
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonResponse({ error: "Field file wajib berisi dokumen." }, 400);
  }

  if (file.size === 0) {
    return jsonResponse({ error: "File kosong." }, 400);
  }

  if (file.size > MAX_DOCUMENT_BYTES) {
    return jsonResponse({ error: "Ukuran file melebihi batas 8 MB." }, 413);
  }

  const extraction = await extractTextFromBuffer(
    Buffer.from(await file.arrayBuffer()),
    file.type,
    file.name,
  );

  const parsed = cvBaseSchema.safeParse({
    jobDescription: optionalFormString(form.get("jobDescription")),
    jobs: parseJobsField(form.get("jobs")),
    topN: parseTopN(form.get("topN")),
    jobTitle: optionalFormString(form.get("jobTitle")),
    companyName: optionalFormString(form.get("companyName")),
    hrdEmail: optionalFormString(form.get("hrdEmail")),
    deepScan: parseBooleanField(form.get("deepScan")),
  });
  if (!parsed.success) return validationError(parsed.error);

  return runCvScreening(
    {
      ...parsed.data,
      cvText: extraction.text,
      source: {
        filename: extraction.filename,
        mimeType: extraction.mimeType,
        pageCount: extraction.pageCount,
        charCount: extraction.charCount,
      },
    },
    requestId,
  );
}

async function handleJson(
  request: Request,
  requestId: string,
  onProgress?: (step: number) => Promise<void>,
  requireLiveGemini = false,
): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Body JSON tidak valid." }, 400);
  }

  const action =
    typeof body === "object" && body !== null && "action" in body
      ? (body as { action?: unknown }).action
      : undefined;

  if (action === "company") {
    const parsed = companyRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return runCompanyCheck(
      parsed.data.companyName,
      parsed.data.hrdEmail,
      requestId,
    );
  }

  if (action === "job") {
    const parsed = jobRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return runJobCheck(
      parsed.data.companyName,
      parsed.data.hrdEmail,
      parsed.data.jobTitle,
      parsed.data.jobDescription,
      requestId,
    );
  }

  if (action === "cv") {
    const parsed = cvJsonRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return runCvScreening(
      {
        ...parsed.data,
        cvText: parsed.data.cvText,
      },
      requestId,
      onProgress,
      requireLiveGemini,
    );
  }

  if (action === "shortlist") {
    const parsed = shortlistRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return runShortlist(
      {
        jobs: parsed.data.jobs,
        candidates: parsed.data.candidates,
        jobIds: parsed.data.jobIds,
        topNPerCandidate: parsed.data.topNPerCandidate,
        minScore: parsed.data.minScore,
        bufferRatio: parsed.data.bufferRatio,
        deepScan: parsed.data.deepScan,
      },
      requestId,
    );
  }

  return jsonResponse(
    { error: "action harus company, job, cv, atau shortlist." },
    400,
  );
}

export async function handleScreenRequest(
  request: Request,
  onProgress?: (step: number) => Promise<void>,
  options: { requireLiveGemini?: boolean } = {},
): Promise<Response> {
  const requestId = randomUUID();

  if (!isAuthorized(request)) {
    return withRequestId(
      jsonResponse({ error: "Unauthorized.", requestId }, 401),
      requestId,
    );
  }

  const rateLimit = checkRateLimit(
    `screen:${clientKey(request)}`,
    screenRateLimitPerMinute(),
  );
  if (!rateLimit.allowed) {
    return withRequestId(
      jsonResponse(
        {
          error: "Terlalu banyak permintaan. Coba lagi nanti.",
          requestId,
        },
        429,
        rateLimitHeaders(rateLimit),
      ),
      requestId,
    );
  }

  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    let response: Response;

    if (contentType.includes("multipart/form-data")) {
      response = await handleMultipart(request, requestId);
    } else {
      response = await handleJson(request, requestId, onProgress, options.requireLiveGemini);
    }

    return withRequestId(response, requestId);
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      return withRequestId(
        jsonResponse({ error: error.message, requestId }, error.status),
        requestId,
      );
    }

    if (options.requireLiveGemini && error instanceof Error) {
      console.error("[screen] Gemini wajib gagal", {
        requestId,
        alasan: error.message,
      });
      return withRequestId(
        jsonResponse({ error: error.message, requestId }, 503),
        requestId,
      );
    }

    console.error("[screen] Unhandled error", { requestId, error });
    return withRequestId(
      jsonResponse({ error: "Gagal memproses permintaan.", requestId }, 500),
      requestId,
    );
  }
}

export function handleScreenInfo(): Response {
  return jsonResponse({
    name: "HireMatch AI screening API",
    version: PROMPT_VERSION,
    actions: {
      company: "Cek risiko domain/nama perusahaan saat registrasi HRD.",
      job: "Cek risiko scam pada lowongan sebelum dipublikasikan.",
      cv: "Validasi, redaksi PII, lalu skor CV terhadap satu atau banyak lowongan.",
      shortlist:
        "Pilih kandidat per lowongan sesuai openings + buffer agar kuota hire tidak kurang.",
    },
    notes: [
      "Gunakan MOCK_AI=1 untuk mode deterministik tanpa API key.",
      "CV dapat dikirim sebagai JSON cvText atau multipart file (PDF/DOCX/TXT).",
      "Shortlist multipart memakai field files (bisa banyak) dan jobs berisi JSON array.",
      "Shortlist memakai openings per lowongan dan buffer default 20% (minimal 1 kandidat).",
      "Set SCREEN_API_TOKEN untuk mewajibkan Bearer token; SCREEN_RATE_LIMIT_PER_MINUTE untuk rate limit.",
      "Gunakan deepScan=true untuk memaksa validasi/scam check berbasis AI.",
    ],
  });
}

export type { CvValidationResult, ScamCheckResult };
