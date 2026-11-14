import { containsCvSignals, redactPii } from "./anonymize";
import { matchCategoryForScore } from "./policy";
import { assessJobScam } from "./trust";

export { isMockMode } from "./runtime";
import type {
  CvValidationResult,
  MatchCategory,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

export function mockCheckJobScam(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
): ScamCheckResult {
  return assessJobScam(companyName, hrdEmail, jobTitle, jobDescription);
}

export function mockValidateAndRedactCV(
  rawPdfText: string,
): CvValidationResult {
  const text = rawPdfText.trim();

  if (!text) {
    return {
      is_valid_cv: false,
      redacted_cv: "",
      reject_reason: "Dokumen kosong.",
    };
  }

  if (!containsCvSignals(text)) {
    return {
      is_valid_cv: false,
      redacted_cv: "",
      reject_reason: "Dokumen tidak terdeteksi sebagai CV yang sah.",
    };
  }

  return {
    is_valid_cv: true,
    redacted_cv: redactPii(text),
    reject_reason: null,
  };
}

interface SkillGroup {
  label: string;
  keywords: string[];
}

const SKILL_GROUPS: SkillGroup[] = [
  {
    label: "backend",
    keywords: [
      "backend",
      "back end",
      "back-end",
      "api",
      "rest",
      "rest api",
      "web service",
      "web services",
      "server",
      "microservice",
    ],
  },
  {
    label: "database",
    keywords: [
      "database",
      "basis data",
      "sql",
      "mysql",
      "postgresql",
      "postgres",
      "relasional",
      "relational",
      "nosql",
      "mongodb",
    ],
  },
  {
    label: "php",
    keywords: ["php", "laravel", "symfony", "codeigniter"],
  },
  {
    label: "frontend",
    keywords: [
      "frontend",
      "front end",
      "react",
      "vue",
      "angular",
      "javascript",
      "typescript",
      "html",
      "css",
    ],
  },
  {
    label: "design",
    keywords: [
      "desain",
      "design",
      "photoshop",
      "illustrator",
      "figma",
      "grafis",
      "graphic",
    ],
  },
];

const STOPWORDS = new Set([
  "dan",
  "yang",
  "untuk",
  "dengan",
  "atau",
  "pada",
  "dari",
  "dalam",
  "akan",
  "ini",
  "itu",
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "are",
  "you",
  "our",
  "menguasai",
  "pengembangan",
  "manajemen",
  "dicari",
  "kerja",
  "posisi",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(text: string, keyword: string): boolean {
  if (keyword.includes(" ") || keyword.includes("-")) {
    return text.includes(keyword);
  }

  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i").test(text);
}

function tokenize(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

function categoryFor(score: number): MatchCategory {
  return matchCategoryForScore(score);
}

function feedbackFor(category: MatchCategory): string {
  switch (category) {
    case "Highly Recommended":
      return "Profil Anda sangat selaras dengan kebutuhan lowongan. Pertahankan dan tonjolkan pencapaian terukur.";
    case "Potential":
      return "Profil Anda cukup relevan, tetapi beberapa kompetensi utama masih perlu diperkuat.";
    default:
      return "Profil Anda belum selaras dengan kebutuhan utama lowongan. Pertimbangkan melengkapi kompetensi yang diminta.";
  }
}

export function mockCalculateSemanticMatch(
  cleanCvText: string,
  jobDescription: string,
): SemanticMatchResult {
  const cvText = normalize(cleanCvText);
  const jdText = normalize(jobDescription);

  const relevantGroups = SKILL_GROUPS.filter((group) =>
    group.keywords.some((keyword) => containsKeyword(jdText, keyword)),
  );
  const matchedGroups = relevantGroups.filter((group) =>
    group.keywords.some((keyword) => containsKeyword(cvText, keyword)),
  );

  let score = 0;
  if (relevantGroups.length > 0) {
    score = Math.round((matchedGroups.length / relevantGroups.length) * 100);
  } else {
    const jdTokens = tokenize(jobDescription);
    const cvTokens = new Set(tokenize(cleanCvText));
    const overlap = jdTokens.filter((token) => cvTokens.has(token));
    score =
      jdTokens.length > 0
        ? Math.round((overlap.length / jdTokens.length) * 100)
        : 0;
  }

  const category = categoryFor(score);
  const matchedLabels = matchedGroups.map((group) => group.label);
  const missingLabels = relevantGroups
    .filter((group) => !matchedGroups.includes(group))
    .map((group) => group.label);

  const strengths =
    matchedLabels.length > 0
      ? `Kandidat menunjukkan kompetensi pada area ${matchedLabels.join(", ")}.`
      : "Belum ada kompetensi utama yang selaras dengan lowongan.";
  const gaps =
    missingLabels.length > 0
      ? `Perlu penguatan pada area ${missingLabels.join(", ")}.`
      : "Tidak ada gap kompetensi utama yang terdeteksi.";

  return {
    match_score: score,
    match_category: category,
    candidate_feedback: feedbackFor(category),
    hr_strengths: strengths,
    hr_gaps: gaps,
    interview_questions: [
      `Ceritakan pengalaman Anda yang paling relevan dengan ${relevantGroups[0]?.label ?? "posisi ini"}.`,
      missingLabels[0]
        ? `Bagaimana Anda menutup gap pada area ${missingLabels[0]}?`
        : "Bagaimana Anda menjaga kualitas kerja secara konsisten?",
      "Berikan contoh proyek nyata dan kontribusi spesifik Anda.",
    ],
  };
}
