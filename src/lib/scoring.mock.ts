import { containsCvSignals, redactPii } from "./anonymize";
import type {
  CvValidationResult,
  MatchCategory,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

export function isMockMode(): boolean {
  const flag = process.env.MOCK_AI?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

const SCAM_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\b(?:bayar|membayar|pembayaran|deposit|transfer)\b/i,
    label: "permintaan pembayaran",
  },
  {
    pattern: /\b(?:judi|slot|gacor|ponzi|money game)\b/i,
    label: "skema judi/ponzi",
  },
  {
    pattern: /\b(?:tanpa|tidak ada)\s+(?:interview|wawancara)\b/i,
    label: "tanpa wawancara",
  },
  {
    pattern: /\b(?:biaya|fee)\s+(?:pelatihan|administrasi|pendaftaran|awal)\b/i,
    label: "biaya di muka",
  },
  {
    pattern: /\bgaji\s+(?:[5-9]\d|\d{3,})\s*juta\b/i,
    label: "gaji tidak wajar",
  },
  { pattern: /\brekening pribadi\b/i, label: "rekening pribadi" },
];

export function mockCheckJobScam(
  jobTitle: string,
  jobDescription: string,
): ScamCheckResult {
  const text = `${jobTitle} ${jobDescription}`;
  const hits = SCAM_PATTERNS.filter(({ pattern }) => pattern.test(text)).map(
    ({ label }) => label,
  );

  if (hits.length > 0) {
    return {
      is_safe: false,
      reason: `Terdeteksi indikasi penipuan: ${hits.join(", ")}.`,
    };
  }

  return {
    is_safe: true,
    reason: "Tidak ada indikasi penipuan yang jelas.",
  };
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
  if (score >= 80) return "Highly Recommended";
  if (score >= 55) return "Potential";
  return "Not Recommended";
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
