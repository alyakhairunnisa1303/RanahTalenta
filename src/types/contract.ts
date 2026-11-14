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
  reason: z.string().trim().min(1).max(1_200),
  signals: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  confidence: z.coerce.number().int().min(0).max(100).default(60),
});

export type ScamCheckResult = z.infer<typeof scamCheckResultSchema>;

export const cvValidationResultSchema = z.object({
  is_valid_cv: z.boolean(),
  redacted_cv: z.string().max(40_000),
  reject_reason: z.string().trim().max(500).nullable(),
});

export type CvValidationResult = z.infer<typeof cvValidationResultSchema>;

export const semanticMatchResultSchema = z.object({
  match_score: z.coerce.number().int().min(0).max(100),
  match_category: matchCategorySchema,
  confidence: z.coerce.number().int().min(0).max(100).default(60),
  candidate_feedback: z.string().trim().min(1).max(1_000),
  hr_strengths: z.string().trim().min(1).max(1_500),
  hr_gaps: z.string().trim().min(1).max(1_500),
  interview_questions: z
    .array(z.string().trim().min(1).max(300))
    .max(3)
    .default([]),
  matched_skills: z
    .array(z.string().trim().min(1).max(100))
    .max(20)
    .default([]),
  missing_skills: z
    .array(z.string().trim().min(1).max(100))
    .max(20)
    .default([]),
  must_have_gaps: z
    .array(z.string().trim().min(1).max(200))
    .max(20)
    .default([]),
  evidence: z.array(z.string().trim().min(1).max(300)).max(10).default([]),
});

export type SemanticMatchResult = z.infer<typeof semanticMatchResultSchema>;

export const shortlistEntrySchema = z.object({
  candidate_id: z.string().trim().min(1).max(200),
  rank: z.number().int().min(1),
  status: z.enum(["selected", "waitlist"]),
  match: semanticMatchResultSchema,
});

export type ShortlistEntry = z.infer<typeof shortlistEntrySchema>;

export const jobShortlistSchema = z.object({
  job_id: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  openings: z.number().int().min(1),
  buffer: z.number().int().min(0),
  target: z.number().int().min(1),
  selected: z.array(shortlistEntrySchema),
  waitlist: z.array(shortlistEntrySchema),
  shortfall: z.number().int().min(0),
  message: z.string().trim().min(1).max(700),
});

export type JobShortlist = z.infer<typeof jobShortlistSchema>;

export const rejectedCandidateSchema = z.object({
  candidate_id: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(1).max(500),
});

export type RejectedCandidate = z.infer<typeof rejectedCandidateSchema>;

export const shortlistResultSchema = z.object({
  jobs: z.array(jobShortlistSchema),
  rejected_candidates: z.array(rejectedCandidateSchema),
  generated_at: z.string(),
});

export type ShortlistResult = z.infer<typeof shortlistResultSchema>;
