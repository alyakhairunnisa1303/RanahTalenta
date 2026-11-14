import { containsCvSignals, redactPii } from "./anonymize";
import { hashInput, type GenerationMeta } from "./audit";
import { TtlCache } from "./cache";
import { env } from "./env";
import { aiUnavailable, AppError } from "./errors";
import {
  generateJsonResult,
  type GenerateJsonOptions,
  type GenerationResult,
} from "./gemini";
import {
  normalizeScamResult,
  normalizeSemanticMatch,
} from "./policy";
import {
  PROMPT_VERSION,
  buildCvRedactionPrompt,
  buildScamCheckPrompt,
  buildSemanticMatchPrompt,
  type JobRequirements,
} from "./prompts";
import { getGeminiModel, isMockMode } from "./runtime";
import * as mockScoring from "./scoring.mock";
import {
  mockCalculateSemanticMatch,
  mockValidateAndRedactCV,
} from "./scoring.mock";
import {
  assessCompanyTrust,
  assessJobScam,
  mergeScamResults,
} from "./trust";
import {
  cvValidationResultSchema,
  scamCheckResultSchema,
  semanticMatchResultSchema,
  type CvValidationResult,
  type ScamCheckResult,
  type SemanticMatchResult,
} from "../types/contract";
import type {
  CvValidationResult as BackendCvValidationResult,
  JobScamCheckResult,
  ScoreOutput,
} from "./types";

export type GenerateJson = <T>(
  options: GenerateJsonOptions<T>,
) => Promise<GenerationResult<T>>;

export interface ServiceOptions {
  onGeneration?: (meta: GenerationMeta) => void;
  jobTitle?: string;
  requirements?: JobRequirements;
  deepScan?: boolean;
  signal?: AbortSignal;
  generate?: GenerateJson;
}

const semanticMatchCache = new TtlCache<string, SemanticMatchResult>({
  ttlMs: 60 * 60 * 1000,
  maxEntries: 5_000,
});

function semanticCacheKey(
  cleanCvText: string,
  jobDescription: string,
  options: ServiceOptions,
): string {
  return `${getGeminiModel()}:${PROMPT_VERSION}:${hashInput({
    cv: cleanCvText,
    jobDescription,
    jobTitle: options.jobTitle,
    requirements: options.requirements,
  })}`;
}

export function clearSemanticMatchCache(): void {
  semanticMatchCache.clear();
}

const SCAM_FALLBACK: ScamCheckResult = {
  is_safe: true,
  risk_level: "Low",
  reason: "Fallback aman: analisis tidak tersedia.",
  signals: [],
  confidence: 50,
};

const CV_FALLBACK: CvValidationResult = {
  is_valid_cv: false,
  redacted_cv: "",
  reject_reason: "Gagal memproses dokumen.",
};

function deterministicGeneration(model = "rules"): GenerationMeta {
  return {
    mode: "deterministic",
    model,
    promptVersion: PROMPT_VERSION,
  };
}

function generationMetaFrom(
  generated: GenerationResult<unknown>,
): GenerationMeta {
  return {
    mode: generated.mode,
    model: generated.model,
    promptVersion: PROMPT_VERSION,
    latencyMs: generated.latencyMs,
    promptTokens: generated.usage?.promptTokens,
    outputTokens: generated.usage?.outputTokens,
    totalTokens: generated.usage?.totalTokens,
    ...(generated.fallbackReason
      ? { fallbackReason: generated.fallbackReason }
      : {}),
  };
}

export class HireMatchAIService {
  async checkCompanyScam(
    companyName: string,
    hrdEmail: string,
    options: ServiceOptions = {},
  ): Promise<ScamCheckResult> {
    options.onGeneration?.(deterministicGeneration());
    return assessCompanyTrust(companyName, hrdEmail);
  }

  async checkJobScam(
    companyName: string,
    hrdEmail: string,
    jobTitle: string,
    jobDescription: string,
    options: ServiceOptions = {},
  ): Promise<ScamCheckResult> {
    const deterministic = assessJobScam(
      companyName,
      hrdEmail,
      jobTitle,
      jobDescription,
    );

    if (isMockMode()) {
      options.onGeneration?.({
        mode: "mock",
        model: "deterministic-mock",
        promptVersion: PROMPT_VERSION,
      });
      return deterministic;
    }

    if (deterministic.risk_level === "High") {
      options.onGeneration?.(deterministicGeneration());
      return deterministic;
    }

    if (deterministic.risk_level === "Low" && !options.deepScan) {
      options.onGeneration?.(deterministicGeneration());
      return deterministic;
    }

    const generated = await (options.generate ?? generateJsonResult)({
      prompt: buildScamCheckPrompt(
        companyName,
        hrdEmail,
        jobTitle,
        jobDescription,
      ),
      schema: scamCheckResultSchema,
      fallback: SCAM_FALLBACK,
      signal: options.signal,
    });
    options.onGeneration?.(generationMetaFrom(generated));

    if (generated.mode === "fallback") {
      return deterministic;
    }

    return mergeScamResults(deterministic, normalizeScamResult(generated.data));
  }

  async validateAndRedactCV(
    rawPdfText: string,
    options: ServiceOptions = {},
  ): Promise<CvValidationResult> {
    const trimmed = rawPdfText.trim();

    if (trimmed.length < 40) {
      options.onGeneration?.(deterministicGeneration("local-validator"));
      return {
        is_valid_cv: false,
        redacted_cv: "",
        reject_reason: "Dokumen terlalu pendek atau kosong.",
      };
    }

    if (isMockMode()) {
      options.onGeneration?.({
        mode: "mock",
        model: "deterministic-mock",
        promptVersion: PROMPT_VERSION,
      });
      return mockValidateAndRedactCV(trimmed);
    }

    const locallyRedacted = redactPii(trimmed);

    if (!options.deepScan && containsCvSignals(locallyRedacted)) {
      options.onGeneration?.(deterministicGeneration("local-validator"));
      return {
        is_valid_cv: true,
        redacted_cv: locallyRedacted,
        reject_reason: null,
      };
    }

    const generated = await (options.generate ?? generateJsonResult)({
      prompt: buildCvRedactionPrompt(locallyRedacted),
      schema: cvValidationResultSchema,
      fallback: CV_FALLBACK,
      signal: options.signal,
    });
    options.onGeneration?.(generationMetaFrom(generated));

    if (generated.mode === "fallback") {
      if (!containsCvSignals(locallyRedacted)) {
        return {
          is_valid_cv: false,
          redacted_cv: "",
          reject_reason: "Dokumen tidak terdeteksi sebagai CV yang sah.",
        };
      }

      return {
        is_valid_cv: true,
        redacted_cv: locallyRedacted,
        reject_reason: null,
      };
    }

    const result = generated.data;
    if (!result.is_valid_cv) {
      return {
        ...result,
        redacted_cv: "",
      };
    }

    return {
      ...result,
      redacted_cv: redactPii(result.redacted_cv || locallyRedacted),
    };
  }

  async calculateSemanticMatch(
    cleanCvText: string,
    jobDescription: string,
    options: ServiceOptions = {},
  ): Promise<SemanticMatchResult> {
    if (isMockMode()) {
      options.onGeneration?.({
        mode: "mock",
        model: "deterministic-mock",
        promptVersion: PROMPT_VERSION,
      });
      return normalizeSemanticMatch(
        mockCalculateSemanticMatch(cleanCvText, jobDescription),
      );
    }

    const cacheKey = options.generate
      ? null
      : semanticCacheKey(cleanCvText, jobDescription, options);
    const cached = cacheKey ? semanticMatchCache.get(cacheKey) : undefined;
    if (cached) {
      options.onGeneration?.({
        mode: "deterministic",
        model: "cache",
        promptVersion: PROMPT_VERSION,
      });
      return cached;
    }

    const localFallback = normalizeSemanticMatch(
      mockCalculateSemanticMatch(cleanCvText, jobDescription),
    );
    const generated = await (options.generate ?? generateJsonResult)({
      prompt: buildSemanticMatchPrompt(cleanCvText, jobDescription, {
        jobTitle: options.jobTitle,
        requirements: options.requirements,
      }),
      schema: semanticMatchResultSchema,
      fallback: localFallback,
      signal: options.signal,
    });
    options.onGeneration?.(generationMetaFrom(generated));

    const normalized = normalizeSemanticMatch(generated.data);
    if (cacheKey && generated.mode === "gemini") {
      semanticMatchCache.set(cacheKey, normalized);
    }

    return normalized;
  }
}

export const hireMatchAIService = new HireMatchAIService();

export const checkCompanyScam = (
  companyName: string,
  hrdEmail: string,
  options?: ServiceOptions,
): Promise<ScamCheckResult> =>
  hireMatchAIService.checkCompanyScam(companyName, hrdEmail, options);

export function checkJobScam(text: string): Promise<JobScamCheckResult>;
export function checkJobScam(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
  options?: ServiceOptions,
): Promise<ScamCheckResult>;
export async function checkJobScam(
  companyNameOrText: string,
  hrdEmail?: string,
  jobTitle?: string,
  jobDescription?: string,
  options?: ServiceOptions,
): Promise<JobScamCheckResult | ScamCheckResult> {
  if (typeof hrdEmail === "undefined") {
    return checkJobScamText(companyNameOrText);
  }

  return hireMatchAIService.checkJobScam(
    companyNameOrText,
    hrdEmail,
    jobTitle ?? "",
    jobDescription ?? "",
    options,
  );
}

export const validateAndRedactCV = (
  rawPdfText: string,
  options?: ServiceOptions,
): Promise<CvValidationResult> =>
  hireMatchAIService.validateAndRedactCV(rawPdfText, options);

export const calculateSemanticMatch = (
  cleanCvText: string,
  jobDescription: string,
  options?: ServiceOptions,
): Promise<SemanticMatchResult> =>
  hireMatchAIService.calculateSemanticMatch(cleanCvText, jobDescription, options);

const NEUTRAL_COMPANY = "PT Perusahaan";
const NEUTRAL_EMAIL = "hrd@perusahaan.co.id";

const QUESTION_FALLBACKS = [
  "Ceritakan pengalaman paling relevan Anda dengan posisi ini.",
  "Bagaimana Anda membuktikan kemampuan utama Anda dalam proyek nyata?",
  "Apa tantangan terbesar yang pernah Anda hadapi, dan bagaimana Anda mengatasinya?",
];

function wrapAiError(message: string, error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }

  console.error(
    "[SCORER] Modul AI gagal memproses permintaan:",
    error instanceof Error ? error.message : error,
  );
  throw aiUnavailable(message);
}

function toBackendScamResult(
  result: ScamCheckResult,
): JobScamCheckResult {
  return {
    is_safe: result.is_safe,
    reason: result.reason ? result.reason.slice(0, 500) : undefined,
  };
}

async function checkJobScamText(text: string): Promise<JobScamCheckResult> {
  try {
    if (env.USE_MOCK) {
      return mockScoring.checkJobScam(text);
    }

    const result = await hireMatchAIService.checkJobScam(
      NEUTRAL_COMPANY,
      NEUTRAL_EMAIL,
      "Lowongan",
      text,
      { deepScan: true },
    );

    return toBackendScamResult(result);
  } catch (error) {
    return wrapAiError("Modul AI gagal memeriksa lowongan.", error);
  }
}

export async function validateCv(
  text: string,
): Promise<BackendCvValidationResult> {
  try {
    if (env.USE_MOCK) {
      return mockScoring.validateCv(text);
    }

    const result = await hireMatchAIService.validateAndRedactCV(text);

    return {
      is_valid_cv: result.is_valid_cv,
      reason: result.reject_reason ?? undefined,
    };
  } catch (error) {
    return wrapAiError("Modul AI gagal memvalidasi CV.", error);
  }
}

function semanticMatchToScoreOutput(
  result: SemanticMatchResult,
): ScoreOutput {
  const questions = [...result.interview_questions];

  for (const fallback of QUESTION_FALLBACKS) {
    if (questions.length >= 3) break;
    if (!questions.includes(fallback)) {
      questions.push(fallback);
    }
  }

  const missing = Array.from(
    new Set([...result.missing_skills, ...result.must_have_gaps]),
  );

  return {
    total: result.match_score,
    sim: result.match_score,
    mustScore: result.match_score,
    skor_kompetensi: result.match_score,
    missing,
    kekuatan: [
      {
        poin: "Kekuatan utama",
        bukti: result.hr_strengths,
      },
    ],
    celah: [
      result.hr_gaps,
      ...result.missing_skills.map(
        (skill) => `Belum ada bukti untuk "${skill}" di CV.`,
      ),
    ],
    candidateFeedback: result.candidate_feedback,
    pertanyaan_wawancara: questions.slice(0, 3),
  };
}

export async function scoreCandidate(
  jd: string,
  cvAnon: string,
  mustHave: string[],
): Promise<ScoreOutput> {
  try {
    if (env.USE_MOCK) {
      return mockScoring.scoreCandidate(jd, cvAnon, mustHave);
    }

    const requirements =
      mustHave.length > 0
        ? `${jd}\n\nKebutuhan wajib: ${mustHave.join(", ")}`
        : jd;
    const result = await hireMatchAIService.calculateSemanticMatch(
      cvAnon,
      requirements,
    );

    return semanticMatchToScoreOutput(result);
  } catch (error) {
    return wrapAiError("Modul AI gagal menilai kandidat.", error);
  }
}
