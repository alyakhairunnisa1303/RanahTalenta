import type {
  MatchCategory,
  RiskLevel,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

export const HIGHLY_RECOMMENDED_MIN_SCORE = 80;
export const POTENTIAL_MIN_SCORE = 60;

export type JobScreeningDecision = "open" | "pending_review" | "blocked";
export type CompanyScreeningDecision =
  | "verified"
  | "pending_review"
  | "blocked";

export function matchCategoryForScore(score: number): MatchCategory {
  if (score >= HIGHLY_RECOMMENDED_MIN_SCORE) return "Highly Recommended";
  if (score >= POTENTIAL_MIN_SCORE) return "Potential";
  return "Not Recommended";
}

export function normalizeSemanticMatch(
  result: SemanticMatchResult,
): SemanticMatchResult {
  const score = Math.max(0, Math.min(100, Math.round(result.match_score)));

  return {
    ...result,
    match_score: score,
    match_category: matchCategoryForScore(score),
  };
}

export function normalizeScamResult(result: ScamCheckResult): ScamCheckResult {
  let riskLevel: RiskLevel = result.risk_level;

  if (!result.is_safe && riskLevel === "Low") {
    riskLevel = "Medium";
  }

  return {
    ...result,
    risk_level: riskLevel,
    is_safe: riskLevel === "Low",
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
