export {
  HireMatchAIService,
  calculateSemanticMatch,
  checkCompanyScam,
  checkJobScam,
  clearSemanticMatchCache,
  hireMatchAIService,
  validateAndRedactCV,
} from "./scorer";

export type { GenerateJson, ServiceOptions } from "./scorer";

export {
  DEFAULT_SHORTLIST_BUFFER_RATIO,
  HIGHLY_RECOMMENDED_MIN_SCORE,
  POTENTIAL_MIN_SCORE,
  companyDecisionForRisk,
  jobDecisionForRisk,
  matchCategoryForScore,
  normalizeScamResult,
  normalizeSemanticMatch,
  weightedMatchScore,
  shortlistTargetForOpenings,
} from "./policy";

export { buildShortlist } from "./shortlist";
export type {
  ShortlistCandidateInput,
  ShortlistJobInput,
  ShortlistOptions,
} from "./shortlist";

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
  JobShortlist,
  MatchCategory,
  RejectedCandidate,
  RiskLevel,
  ScamCheckResult,
  SemanticMatchResult,
  ShortlistEntry,
  ShortlistResult,
} from "../types/contract";
