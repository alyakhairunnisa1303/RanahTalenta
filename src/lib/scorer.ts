import { generateJson } from "./gemini";
import {
  buildCvRedactionPrompt,
  buildScamCheckPrompt,
  buildSemanticMatchPrompt,
} from "./prompts";
import {
  isMockMode,
  mockCalculateSemanticMatch,
  mockCheckJobScam,
  mockValidateAndRedactCV,
} from "./scoring.mock";
import {
  cvValidationResultSchema,
  scamCheckResultSchema,
  semanticMatchResultSchema,
  type CvValidationResult,
  type ScamCheckResult,
  type SemanticMatchResult,
} from "../types/contract";

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

const MATCH_FALLBACK: SemanticMatchResult = {
  match_score: 0,
  match_category: "Not Recommended",
  candidate_feedback: "Terjadi kesalahan analisis sistem.",
  hr_strengths: "-",
  hr_gaps: "-",
  interview_questions: [],
};

export class HireMatchAIService {
  async checkJobScam(
    companyName: string,
    hrdEmail: string,
    jobTitle: string,
    jobDescription: string,
  ): Promise<ScamCheckResult> {
    if (isMockMode()) {
      return mockCheckJobScam(
        companyName,
        hrdEmail,
        jobTitle,
        jobDescription,
      );
    }

    return generateJson({
      prompt: buildScamCheckPrompt(
        companyName,
        hrdEmail,
        jobTitle,
        jobDescription,
      ),
      schema: scamCheckResultSchema,
      fallback: SCAM_FALLBACK,
    });
  }

  async validateAndRedactCV(rawPdfText: string): Promise<CvValidationResult> {
    if (isMockMode()) {
      return mockValidateAndRedactCV(rawPdfText);
    }

    return generateJson({
      prompt: buildCvRedactionPrompt(rawPdfText),
      schema: cvValidationResultSchema,
      fallback: CV_FALLBACK,
    });
  }

  async calculateSemanticMatch(
    cleanCvText: string,
    jobDescription: string,
  ): Promise<SemanticMatchResult> {
    if (isMockMode()) {
      return mockCalculateSemanticMatch(cleanCvText, jobDescription);
    }

    return generateJson({
      prompt: buildSemanticMatchPrompt(cleanCvText, jobDescription),
      schema: semanticMatchResultSchema,
      fallback: MATCH_FALLBACK,
    });
  }
}

export const hireMatchAIService = new HireMatchAIService();

export const checkJobScam = (
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
): Promise<ScamCheckResult> =>
  hireMatchAIService.checkJobScam(
    companyName,
    hrdEmail,
    jobTitle,
    jobDescription,
  );

export const validateAndRedactCV = (
  rawPdfText: string,
): Promise<CvValidationResult> =>
  hireMatchAIService.validateAndRedactCV(rawPdfText);

export const calculateSemanticMatch = (
  cleanCvText: string,
  jobDescription: string,
): Promise<SemanticMatchResult> =>
  hireMatchAIService.calculateSemanticMatch(cleanCvText, jobDescription);
