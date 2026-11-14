import { z } from "zod";
import { createAuditMeta, type GenerationMeta } from "./audit";
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

const jobInputSchema = z.object({
  id: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(20).max(20_000),
});

const cvTargetFields = {
  jobDescription: z.string().trim().min(20).max(20_000).optional(),
  jobs: z.array(jobInputSchema).min(1).max(200).optional(),
  topN: z.number().int().min(1).max(20).default(5),
  jobTitle: z.string().trim().max(200).optional(),
  companyName: z.string().trim().max(200).optional(),
  hrdEmail: z.string().trim().email().max(320).optional(),
};

type CvTarget = {
  jobDescription?: string;
  jobs?: JobInput[];
};

function hasJobTarget(data: CvTarget): boolean {
  return Boolean(data.jobDescription || (data.jobs && data.jobs.length > 0));
}

const companyRequestSchema = z.object({
  action: z.literal("company"),
  ...companyFields,
});

const jobRequestSchema = z.object({
  action: z.literal("job"),
  ...jobFields,
});

const cvBaseSchema = z.object(cvTargetFields).refine(hasJobTarget, {
  message: "jobDescription atau jobs wajib diisi.",
  path: ["jobDescription"],
});

const cvJsonRequestSchema = z
  .object({
    action: z.literal("cv"),
    cvText: z.string().min(40).max(30_000),
    ...cvTargetFields,
  })
  .refine(hasJobTarget, {
    message: "jobDescription atau jobs wajib diisi.",
    path: ["jobDescription"],
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
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

function parseTopN(value: FormDataEntryValue | null): number {
  if (typeof value !== "string" || value.trim() === "") return 5;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function optionalFormString(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

async function runCompanyCheck(
  companyName: string,
  hrdEmail: string,
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
    ),
  });
}

async function runJobCheck(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
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
    ),
  });
}

async function runCvScreening(input: CvScreeningInput): Promise<Response> {
  if (!input.jobs?.length && !input.jobDescription) {
    return jsonResponse(
      { error: "jobDescription atau jobs wajib diisi." },
      400,
    );
  }

  const generations: GenerationMeta[] = [];
  const onGeneration = (meta: GenerationMeta) => generations.push(meta);

  const validation = await validateAndRedactCV(input.cvText, {
    onGeneration,
  });

  const auditBase = {
    action: "cv",
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    hrdEmail: input.hrdEmail,
    source: input.source,
    jobDescription: input.jobDescription,
    jobs: input.jobs,
    topN: input.topN,
  };

  if (!validation.is_valid_cv) {
    return jsonResponse({
      status: "rejected",
      validation,
      audit: createAuditMeta(
        { ...auditBase, cvText: "", reject_reason: validation.reject_reason },
        generations,
      ),
    });
  }

  if (input.jobs?.length) {
    const results: RankedMatch[] = await rankAndScoreJobs(
      validation.redacted_cv,
      input.jobs,
      {
        topN: input.topN,
        onGeneration,
      },
    );

    return jsonResponse({
      status: "ranked",
      validation,
      results,
      audit: createAuditMeta(
        { ...auditBase, cvText: validation.redacted_cv },
        generations,
      ),
    });
  }

  const match: SemanticMatchResult = await calculateSemanticMatch(
    validation.redacted_cv,
    input.jobDescription!,
    { onGeneration },
  );

  return jsonResponse({
    status: "scored",
    validation,
    match,
    audit: createAuditMeta(
      { ...auditBase, cvText: validation.redacted_cv },
      generations,
    ),
  });
}

async function handleMultipart(request: Request): Promise<Response> {
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

    return runCompanyCheck(parsed.data.companyName, parsed.data.hrdEmail);
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
    );
  }

  if (action !== "cv") {
    return jsonResponse(
      { error: "action harus company, job, atau cv." },
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
  });
  if (!parsed.success) return validationError(parsed.error);

  return runCvScreening({
    ...parsed.data,
    cvText: extraction.text,
    source: {
      filename: extraction.filename,
      mimeType: extraction.mimeType,
      pageCount: extraction.pageCount,
      charCount: extraction.charCount,
    },
  });
}

async function handleJson(request: Request): Promise<Response> {
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

    return runCompanyCheck(parsed.data.companyName, parsed.data.hrdEmail);
  }

  if (action === "job") {
    const parsed = jobRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return runJobCheck(
      parsed.data.companyName,
      parsed.data.hrdEmail,
      parsed.data.jobTitle,
      parsed.data.jobDescription,
    );
  }

  if (action === "cv") {
    const parsed = cvJsonRequestSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    return runCvScreening({
      ...parsed.data,
      cvText: parsed.data.cvText,
    });
  }

  return jsonResponse({ error: "action harus company, job, atau cv." }, 400);
}

export async function handleScreenRequest(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.includes("multipart/form-data")) {
      return await handleMultipart(request);
    }

    return await handleJson(request);
  } catch (error) {
    if (error instanceof DocumentExtractionError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error("[screen] Unhandled error", error);
    return jsonResponse({ error: "Gagal memproses permintaan." }, 500);
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
    },
    notes: [
      "Gunakan MOCK_AI=1 untuk mode deterministik tanpa API key.",
      "CV dapat dikirim sebagai JSON cvText atau multipart file (PDF/DOCX/TXT).",
    ],
  });
}

export type { CvValidationResult, ScamCheckResult };
