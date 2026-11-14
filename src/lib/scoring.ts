export {
  HireMatchAIService,
  calculateSemanticMatch,
  checkCompanyScam,
  checkJobScam,
  hireMatchAIService,
  validateAndRedactCV,
} from "./scorer";

export type { ServiceOptions } from "./scorer";

export {
  HIGHLY_RECOMMENDED_MIN_SCORE,
  POTENTIAL_MIN_SCORE,
  companyDecisionForRisk,
  jobDecisionForRisk,
  matchCategoryForScore,
  normalizeScamResult,
  normalizeSemanticMatch,
} from "./policy";

export {
  assessCompanyTrust,
  assessJobScam,
  domainMatchesCompany,
  isDisposableEmailDomain,
  isPublicEmailDomain,
  isValidEmail,
  mergeScamResults,
} from "./trust";

export type {
  CvValidationResult,
  MatchCategory,
  RiskLevel,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";
