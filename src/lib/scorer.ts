import { containsCvSignals, redactPii } from "./anonymize";
import type { GenerationMeta } from "./audit";
import { generateJsonResult } from "./gemini";
import {
  normalizeScamResult,
  normalizeSemanticMatch,
} from "./policy";
import {
  PROMPT_VERSION,
  buildCvRedactionPrompt,
  buildScamCheckPrompt,
  buildSemanticMatchPrompt,
} from "./prompts";
import { isMockMode } from "./runtime";
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

export interface ServiceOptions {
  onGeneration?: (meta: GenerationMeta) => void;
}

const SCAM_FALLBACK: ScamCheckResult = {
  is_safe: true,
  risk_level: "Low",
  reason: "Fallback aman: analisis tidak tersedia.",
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

    const generated = await generateJsonResult({
      prompt: buildScamCheckPrompt(
        companyName,
        hrdEmail,
        jobTitle,
        jobDescription,
      ),
      schema: scamCheckResultSchema,
      fallback: SCAM_FALLBACK,
    });
    options.onGeneration?.({
      mode: generated.mode,
      model: generated.model,
      promptVersion: PROMPT_VERSION,
    });

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
    const generated = await generateJsonResult({
      prompt: buildCvRedactionPrompt(locallyRedacted),
      schema: cvValidationResultSchema,
      fallback: CV_FALLBACK,
    });
    options.onGeneration?.({
      mode: generated.mode,
      model: generated.model,
      promptVersion: PROMPT_VERSION,
    });

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

    const localFallback = normalizeSemanticMatch(
      mockCalculateSemanticMatch(cleanCvText, jobDescription),
    );
    const generated = await generateJsonResult({
      prompt: buildSemanticMatchPrompt(cleanCvText, jobDescription),
      schema: semanticMatchResultSchema,
      fallback: localFallback,
    });
    options.onGeneration?.({
      mode: generated.mode,
      model: generated.model,
      promptVersion: PROMPT_VERSION,
    });

    return normalizeSemanticMatch(generated.data);
  }
}

export const hireMatchAIService = new HireMatchAIService();

export const checkCompanyScam = (
  companyName: string,
  hrdEmail: string,
  options?: ServiceOptions,
): Promise<ScamCheckResult> =>
  hireMatchAIService.checkCompanyScam(companyName, hrdEmail, options);

export const checkJobScam = (
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
  options?: ServiceOptions,
): Promise<ScamCheckResult> =>
  hireMatchAIService.checkJobScam(
    companyName,
    hrdEmail,
    jobTitle,
    jobDescription,
    options,
  );

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
  hireMatchAIService.calculateSemanticMatch(
    cleanCvText,
    jobDescription,
    options,
  );
