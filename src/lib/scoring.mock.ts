import { containsCvSignals, redactPii } from "./anonymize";
import type {
  CvValidationResult,
  MatchCategory,
  RiskLevel,
  ScamCheckResult,
  SemanticMatchResult,
} from "../types/contract";

export function isMockMode(): boolean {
  const flag = process.env.MOCK_AI?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

const FREE_MAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.id",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
]);

const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "throwawaymail.com",
  "yopmail.com",
];

const BIG_COMPANY_PATTERN =
  /\b(?:pt|tbk|persero|bank|group|grup|holding|corp|corporation|inc|ltd)\b/i;

const COMPANY_STOPWORDS = new Set([
  "pt",
  "tbk",
  "persero",
  "bank",
  "group",
  "grup",
  "holding",
  "corp",
  "corporation",
  "inc",
  "ltd",
  "indonesia",
  "the",
  "dan",
  "and",
]);

function normalizeEmailDomain(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  return at === -1 ? "" : trimmed.slice(at + 1);
}

function domainBase(domain: string): string {
  return domain.replace(
    /\.(?:co\.id|com|co|net|org|id|io|ai|dev|app|xyz|site|online)$/i,
    "",
  );
}

function companyTokens(companyName: string): string[] {
  return normalize(companyName)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !COMPANY_STOPWORDS.has(token));
}

function domainMatchesCompany(companyName: string, domain: string): boolean {
  const base = domainBase(domain).replace(/[^a-z0-9]/g, "");
  if (!base) return false;

  return companyTokens(companyName).some(
    (token) => base.includes(token) || token.includes(base),
  );
}

interface ScamSignal {
  label: string;
  severity: RiskLevel;
}

export function mockCheckJobScam(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
): ScamCheckResult {
  const text = `${companyName} ${jobTitle} ${jobDescription}`;
  const signals: ScamSignal[] = [];

  if (
    /\b(?:bayar|membayar|pembayaran|deposit|transfer|biaya\s+(?:pelatihan|administrasi|pendaftaran|awal)|tiket|akomodasi)\b/i.test(
      text,
    )
  ) {
    signals.push({
      label: "permintaan pembayaran di muka",
      severity: "High",
    });
  }

  const highSalary = /\bgaji\s+(?:[5-9]\d|\d{3,})\s*juta\b/i.test(text);
  const easyRequirements =
    /\b(?:tanpa pengalaman|syarat mudah|hanya modal hp|modal hp|hanya mengetik|mengetik|tanpa wawancara|tanpa interview)\b/i.test(
      text,
    );

  if (highSalary && easyRequirements) {
    signals.push({
      label: "gaji tidak wajar untuk syarat yang sangat mudah",
      severity: "High",
    });
  } else if (highSalary) {
    signals.push({ label: "gaji di atas kewajaran", severity: "Medium" });
  } else if (easyRequirements) {
    signals.push({
      label: "syarat lowongan terlalu mudah",
      severity: "Medium",
    });
  }

  if (
    /\b(?:whatsapp|wa\.me|telegram|t\.me)\b/i.test(text) ||
    /\b(?:hubungi|chat|kirim|kontak)\b[^.\n]{0,40}\b(?:wa|whatsapp|telegram)\b/i.test(
      text,
    )
  ) {
    signals.push({
      label: "mengarahkan komunikasi ke WhatsApp/Telegram pribadi",
      severity: "High",
    });
  }

  const domain = normalizeEmailDomain(hrdEmail);
  if (!domain) {
    signals.push({ label: "email HRD tidak valid", severity: "Medium" });
  } else if (
    DISPOSABLE_DOMAINS.some((candidate) => domain.endsWith(candidate))
  ) {
    signals.push({ label: "domain email sementara", severity: "High" });
  } else if (FREE_MAIL_DOMAINS.has(domain)) {
    const bigCompany = BIG_COMPANY_PATTERN.test(companyName);
    signals.push({
      label: bigCompany
        ? "perusahaan besar memakai domain email gratis"
        : "email HRD memakai domain gratis",
      severity: bigCompany ? "High" : "Medium",
    });
  } else if (
    companyName.trim() &&
    !domainMatchesCompany(companyName, domain)
  ) {
    signals.push({
      label: "domain email tidak cocok dengan nama perusahaan",
      severity: "Medium",
    });
  }

  const riskLevel: RiskLevel = signals.some(
    (signal) => signal.severity === "High",
  )
    ? "High"
    : signals.some((signal) => signal.severity === "Medium")
      ? "Medium"
      : "Low";

  return {
    is_safe: riskLevel === "Low",
    risk_level: riskLevel,
    reason:
      signals.length > 0
        ? `Terdeteksi indikasi penipuan: ${signals
            .map((signal) => signal.label)
            .join("; ")}.`
        : "Tidak ada indikasi penipuan yang jelas.",
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
