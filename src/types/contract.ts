import { z } from "zod";

export const matchCategorySchema = z.enum([
  "Highly Recommended",
  "Potential",
  "Not Recommended",
]);

export type MatchCategory = z.infer<typeof matchCategorySchema>;

export const riskLevelSchema = z.enum(["Low", "Medium", "High"]);

export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const scamCheckResultSchema = z.object({
  is_safe: z.boolean(),
  risk_level: riskLevelSchema,
  reason: z.string(),
});

export type ScamCheckResult = z.infer<typeof scamCheckResultSchema>;

export const cvValidationResultSchema = z.object({
  is_valid_cv: z.boolean(),
  redacted_cv: z.string(),
  reject_reason: z.string().nullable(),
});

export type CvValidationResult = z.infer<typeof cvValidationResultSchema>;

export const semanticMatchResultSchema = z.object({
  match_score: z.coerce.number().int().min(0).max(100),
  match_category: matchCategorySchema,
  candidate_feedback: z.string(),
  hr_strengths: z.string(),
  hr_gaps: z.string(),
  interview_questions: z.array(z.string()),
});

export type SemanticMatchResult = z.infer<typeof semanticMatchResultSchema>;
