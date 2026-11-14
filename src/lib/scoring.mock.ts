import { containsCvSignals, redactPii } from "./anonymize";
import { dedupe, extractKeywords, normalizeText } from "./keywords";
import { matchCategoryForScore } from "./policy";
import { assessJobScam } from "./trust";
import type {
  CvValidationResult as BackendCvValidationResult,
  JobScamCheckResult,
  ScoreOutput,
} from "./types";
import type {
  CvValidationResult,
  MatchCategory,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

export { isMockMode } from "./runtime";

const SCAM_PHRASES = ["biaya administrasi", "transfer dulu", "bayar dulu"];
const QUESTION_FALLBACKS = [
  "pengalaman relevan",
  "kolaborasi tim",
  "pemecahan masalah",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPresent(keyword: string, cvText: string, cvTokens: Set<string>) {
  const normalized = normalizeText(keyword).trim();
  if (!normalized) {
    return false;
  }
  return normalized.includes(" ")
    ? normalizeText(cvText).includes(normalized)
    : cvTokens.has(normalized);
}

export function checkJobScam(text: string): JobScamCheckResult {
  const normalized = normalizeText(text);
  const phrase = SCAM_PHRASES.find((item) => normalized.includes(item));

  if (!phrase) {
    return { is_safe: true };
  }

  return {
    is_safe: false,
    reason: `Lowongan mengandung indikasi scam: "${phrase}".`,
  };
}

export function validateCv(text: string): BackendCvValidationResult {
  const compact = text.replace(/\s+/g, " ").trim();

  if (compact.length > 200) {
    return { is_valid_cv: true };
  }

  return {
    is_valid_cv: false,
    reason:
      "Teks CV terlalu pendek. Unggah CV PDF yang memuat pengalaman dan keahlian.",
  };
}

export function scoreCandidate(
  jd: string,
  cvAnon: string,
  mustHave: string[],
): ScoreOutput {
  const jdKeywords = extractKeywords(jd, 50);
  const cvTokens = new Set(extractKeywords(cvAnon, 500));
  const required = dedupe(mustHave.map((item) => item.trim()).filter(Boolean));

  const matchedJd = jdKeywords.filter((keyword) =>
    isPresent(keyword, cvAnon, cvTokens),
  );
  const matchedMust = required.filter((keyword) =>
    isPresent(keyword, cvAnon, cvTokens),
  );
  const missing = required.filter(
    (keyword) => !isPresent(keyword, cvAnon, cvTokens),
  );

  const sim =
    jdKeywords.length > 0
      ? Math.round((matchedJd.length / jdKeywords.length) * 100)
      : 50;
  const mustScore =
    required.length > 0
      ? Math.round((matchedMust.length / required.length) * 100)
      : sim;
  const skorKompetensi = clamp(Math.round((sim + mustScore) / 2), 0, 100);
  const total = clamp(
    Math.round(sim * 0.4 + mustScore * 0.6),
    40,
    95,
  );

  const strengths = dedupe([...matchedMust, ...matchedJd])
    .slice(0, 5)
    .map((keyword) => ({
      poin: `Menguasai ${keyword}`,
      bukti: `Kata kunci "${keyword}" ditemukan di CV.`,
    }));

  if (strengths.length === 0) {
    strengths.push({
      poin: "CV dapat terbaca",
      bukti: "Teks CV berhasil diekstrak dan dianalisis.",
    });
  }

  const gaps = missing
    .slice(0, 5)
    .map((keyword) => `Belum ada bukti untuk "${keyword}" di CV.`);

  const focus = dedupe([
    ...missing,
    ...matchedMust,
    ...matchedJd,
    ...QUESTION_FALLBACKS,
  ]);

  const feedbackParts = [`Skor kecocokan CV Anda ${total}/100.`];
  if (missing.length > 0) {
    feedbackParts.push(
      `Perkuat CV dengan bukti untuk: ${missing.slice(0, 3).join(", ")}.`,
    );
  } else {
    feedbackParts.push("Semua must-have utama sudah terlihat di CV.");
  }
  feedbackParts.push(
    "Tambahkan pencapaian yang terukur agar profil lebih meyakinkan.",
  );

  return {
    total,
    sim,
    mustScore,
    skor_kompetensi: skorKompetensi,
    missing,
    kekuatan: strengths,
    celah: gaps,
    candidateFeedback: feedbackParts.join(" "),
    pertanyaan_wawancara: [
      `Ceritakan pengalaman Anda yang paling relevan dengan "${focus[0]}".`,
      `Bagaimana Anda membuktikan kemampuan "${focus[1]}" dalam proyek nyata?`,
      `Apa tantangan terbesar terkait "${focus[2]}", dan bagaimana Anda mengatasinya?`,
    ],
  };
}

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
    skill_score: score,
    experience_score: score,
    education_score: 0,
    education_applicable: false,
    confidence:
      relevantGroups.length === 0
        ? 50
        : Math.round(
            60 + (matchedGroups.length / relevantGroups.length) * 30,
          ),
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
    matched_skills: matchedLabels,
    missing_skills: missingLabels,
    must_have_gaps: [],
    evidence: [],
  };
}
