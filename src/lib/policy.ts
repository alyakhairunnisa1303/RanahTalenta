import type {
  CriteriaWeights,
  MatchCategory,
  RiskLevel,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

export const HIGHLY_RECOMMENDED_MIN_SCORE = 80;
export const POTENTIAL_MIN_SCORE = 60;
export const DEFAULT_SHORTLIST_BUFFER_RATIO = 0.2;

export type JobScreeningDecision = "open" | "pending_review" | "blocked";
export type CompanyScreeningDecision =
  | "verified"
  | "pending_review"
  | "blocked";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function cleanList(values: string[] | undefined, maxItems: number): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

export function matchCategoryForScore(score: number): MatchCategory {
  if (score >= HIGHLY_RECOMMENDED_MIN_SCORE) return "Highly Recommended";
  if (score >= POTENTIAL_MIN_SCORE) return "Potential";
  return "Not Recommended";
}

export function weightedMatchScore(
  scores: Pick<SemanticMatchResult, "skill_score" | "experience_score" | "education_score" | "education_applicable">,
  weights: CriteriaWeights,
): number {
  let skillWeight = weights.skill_weight;
  let experienceWeight = weights.experience_weight;
  const educationWeight = scores.education_applicable ? weights.education_weight : 0;
  if (skillWeight + experienceWeight + educationWeight === 0) {
    skillWeight = 50;
    experienceWeight = 50;
  }
  const totalWeight = skillWeight + experienceWeight + educationWeight;
  return Math.round(
    (scores.skill_score * skillWeight +
      scores.experience_score * experienceWeight +
      scores.education_score * educationWeight) /
      totalWeight,
  );
}

export function normalizeSemanticMatch(
  result: SemanticMatchResult,
): SemanticMatchResult {
  const mustHaveGaps = cleanList(result.must_have_gaps, 20);
  const rawScore = clampScore(result.match_score);
  const score =
    mustHaveGaps.length > 0
      ? Math.min(rawScore, POTENTIAL_MIN_SCORE - 1)
      : rawScore;

  return {
    ...result,
    match_score: score,
    match_category: matchCategoryForScore(score),
    confidence: clampScore(result.confidence ?? 60),
    candidate_feedback: result.candidate_feedback.trim(),
    hr_strengths: result.hr_strengths.trim(),
    hr_gaps: result.hr_gaps.trim(),
    interview_questions: cleanList(result.interview_questions, 3),
    matched_skills: cleanList(result.matched_skills, 20),
    missing_skills: cleanList(result.missing_skills, 20),
    must_have_gaps: mustHaveGaps,
    evidence: cleanList(result.evidence, 10),
  };
}

export function normalizeScamResult(result: ScamCheckResult): ScamCheckResult {
  let riskLevel: RiskLevel = result.risk_level;

  if (!result.is_safe && riskLevel === "Low") {
    riskLevel = "Medium";
  }

  const defaultConfidence =
    riskLevel === "High" ? 85 : riskLevel === "Medium" ? 70 : 80;

  return {
    ...result,
    reason: result.reason.trim(),
    signals: cleanList(result.signals, 20),
    confidence: clampScore(result.confidence ?? defaultConfidence),
    risk_level: riskLevel,
    is_safe: riskLevel === "Low",
  };
}

export function shortlistTargetForOpenings(
  openings: number,
  buffer?: number,
): { openings: number; buffer: number; target: number } {
  const normalizedOpenings = Math.max(1, Math.round(openings));
  const normalizedBuffer =
    buffer === undefined
      ? Math.max(1, Math.ceil(normalizedOpenings * DEFAULT_SHORTLIST_BUFFER_RATIO))
      : Math.max(0, Math.round(buffer));

  return {
    openings: normalizedOpenings,
    buffer: normalizedBuffer,
    target: normalizedOpenings + normalizedBuffer,
  };
}

export function jobDecisionForRisk(riskLevel: RiskLevel): JobScreeningDecision {
  switch (riskLevel) {
    case "Low":
      return "open";
    case "Medium":
      return "pending_review";
    case "High":
      return "blocked";
  }
}

export function companyDecisionForRisk(
  riskLevel: RiskLevel,
): CompanyScreeningDecision {
  switch (riskLevel) {
    case "Low":
      return "verified";
    case "Medium":
      return "pending_review";
    case "High":
      return "blocked";
  }
}
