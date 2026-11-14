import { normalizeScamResult } from "./policy";
import type { RiskLevel, ScamCheckResult } from "../types/contract";

export const FREE_MAIL_DOMAINS = new Set([
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
  "icloud.com",
]);

export const DISPOSABLE_MAIL_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "tempmail.id",
  "throwawaymail.com",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
];

const KNOWN_BIG_COMPANY_PATTERNS = [
  /\b(?:tokopedia|gojek|goto|traveloka|shopee|grab|bukalapak|blibli|tiket\.com|jne|j&t|pos indonesia)\b/i,
  /\b(?:telkom|telkomsel|indosat|xl axiata|pertamina|unilever|nestle|danone|astra|sampoerna|kalbe|sinarmas|mayora|wings|indofood|garuda|citilink|lion air)\b/i,
  /\b(?:bank\s+(?:central\s+asia|bca|mandiri|bni|bri|btn|permata|cimb|danamon|panin|mega))\b/i,
  /\b(?:tbk|persero)\b/i,
];

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
  "cv",
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PAYMENT_PATTERN =
  /\b(?:wajib\s+(?:bayar|membayar|transfer|setor)|biaya\s+(?:pelatihan|administrasi|pendaftaran|awal|tiket|akomodasi|transport)|deposit|uang\s+(?:muka|jaminan|pendaftaran)|bayar\s+(?:biaya|deposit|pelatihan|administrasi|pendaftaran|tiket|akomodasi)|transfer\s+(?:biaya|deposit|uang|sejumlah|rp))\b/gi;

const OTP_PATTERN =
  /\b(?:otp|kode\s+(?:otp|verifikasi)|pin|password|kata\s+sandi)\b/i;

const WHATSAPP_PATTERN = /\b(?:whatsapp|wa\.me|wa|telegram|t\.me)\b/i;

const PERSONAL_PHONE_PATTERN = /(?:\+62|62|0)8\d{7,11}/;

const HIGH_RISK_CONTACT_PATTERN =
  /\b(?:otp|kode\s+verifikasi|kirim\s+(?:cv|berkas|dokumen)|nomor\s+pribadi|chat\s+pribadi|dm|inbox|rekening|tanpa\s+(?:interview|wawancara))\b/i;

const NEGATION_PATTERN =
  /\b(?:tidak|tanpa|bukan|gratis|free|bebas|no|not|never|tidak\s+ada|tidak\s+memungut|tidak\s+dipungut)\b/i;

interface TrustSignal {
  label: string;
  severity: RiskLevel;
}

const RISK_RANK: Record<RiskLevel, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
};

export function normalizeEmailDomain(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  return at === -1 ? "" : trimmed.slice(at + 1);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function isPublicEmailDomain(domain: string): boolean {
  return FREE_MAIL_DOMAINS.has(domain.toLowerCase());
}

export function isDisposableEmailDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  return DISPOSABLE_MAIL_DOMAINS.some(
    (candidate) => normalized === candidate || normalized.endsWith(`.${candidate}`),
  );
}

export function isBigCompanyName(companyName: string): boolean {
  return KNOWN_BIG_COMPANY_PATTERNS.some((pattern) =>
    pattern.test(companyName),
  );
}

function domainBase(domain: string): string {
  return domain.replace(
    /\.(?:co\.id|com|co|net|org|id|io|ai|dev|app|xyz|site|online)$/i,
    "",
  );
}

function companyTokens(companyName: string): string[] {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !COMPANY_STOPWORDS.has(token));
}

export function domainMatchesCompany(
  companyName: string,
  domain: string,
): boolean {
  const base = domainBase(domain).replace(/[^a-z0-9]/g, "");
  if (!base) return false;

  return companyTokens(companyName).some(
    (token) => base.includes(token) || token.includes(base),
  );
}

function hasUnnegatedSignal(text: string, pattern: RegExp): boolean {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const clause = text
      .slice(Math.max(0, match.index - 60), match.index)
      .split(/[.;\n]/)
      .pop()
      ?.trim();

    if (!clause || !NEGATION_PATTERN.test(clause)) {
      return true;
    }
  }

  return false;
}

function riskFromSignals(signals: TrustSignal[]): RiskLevel {
  if (signals.some((signal) => signal.severity === "High")) return "High";
  if (signals.some((signal) => signal.severity === "Medium")) return "Medium";
  return "Low";
}

function confidenceForRisk(riskLevel: RiskLevel): number {
  if (riskLevel === "High") return 90;
  if (riskLevel === "Medium") return 75;
  return 80;
}

function reasonFromSignals(signals: TrustSignal[], safeReason: string): string {
  if (signals.length === 0) return safeReason;

  return `Terdeteksi indikasi: ${signals
    .map((signal) => signal.label)
    .join("; ")}.`;
}

function collectCompanySignals(
  companyName: string,
  hrdEmail: string,
): TrustSignal[] {
  const signals: TrustSignal[] = [];
  const normalizedCompany = companyName.trim();
  const normalizedEmail = hrdEmail.trim();

  if (!normalizedCompany) {
    signals.push({ label: "nama perusahaan kosong", severity: "Medium" });
  }

  if (!isValidEmail(normalizedEmail)) {
    signals.push({ label: "email HRD tidak valid", severity: "Medium" });
  }

  const domain = normalizeEmailDomain(normalizedEmail);
  if (domain) {
    if (isDisposableEmailDomain(domain)) {
      signals.push({ label: "domain email sementara", severity: "High" });
    } else if (isPublicEmailDomain(domain)) {
      if (isBigCompanyName(normalizedCompany)) {
        signals.push({
          label: "perusahaan besar memakai domain email gratis",
          severity: "High",
        });
      } else {
        signals.push({
          label: "email HRD memakai domain publik; perlu verifikasi manual",
          severity: "Medium",
        });
      }
    } else if (
      normalizedCompany &&
      !domainMatchesCompany(normalizedCompany, domain)
    ) {
      signals.push({
        label: "domain email tidak cocok dengan nama perusahaan",
        severity: "Medium",
      });
    }
  }

  return signals;
}

export function assessCompanyTrust(
  companyName: string,
  hrdEmail: string,
): ScamCheckResult {
  const signals = collectCompanySignals(companyName, hrdEmail);
  const riskLevel = riskFromSignals(signals);

  return normalizeScamResult({
    is_safe: riskLevel === "Low",
    risk_level: riskLevel,
    reason: reasonFromSignals(
      signals,
      "Domain email perusahaan valid dan tidak ada indikasi penipuan.",
    ),
    signals: signals.map((signal) => signal.label),
    confidence: confidenceForRisk(riskLevel),
  });
}

export function assessJobScam(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
): ScamCheckResult {
  const signals = collectCompanySignals(companyName, hrdEmail);
  const text = `${companyName} ${jobTitle} ${jobDescription}`;

  if (hasUnnegatedSignal(text, PAYMENT_PATTERN)) {
    signals.push({
      label: "permintaan pembayaran di muka",
      severity: "High",
    });
  }

  if (OTP_PATTERN.test(text)) {
    signals.push({
      label: "meminta OTP/PIN/password",
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

  if (WHATSAPP_PATTERN.test(text)) {
    const hasHighRiskContact =
      HIGH_RISK_CONTACT_PATTERN.test(text) ||
      PERSONAL_PHONE_PATTERN.test(text) ||
      hasUnnegatedSignal(text, PAYMENT_PATTERN);

    signals.push({
      label: hasHighRiskContact
        ? "komunikasi ke WhatsApp/Telegram pribadi dengan sinyal risiko tinggi"
        : "komunikasi via WhatsApp/Telegram; verifikasi kanal resmi",
      severity: hasHighRiskContact ? "High" : "Medium",
    });
  }

  const riskLevel = riskFromSignals(signals);

  return normalizeScamResult({
    is_safe: riskLevel === "Low",
    risk_level: riskLevel,
    reason: reasonFromSignals(
      signals,
      "Tidak ada indikasi penipuan yang jelas.",
    ),
    signals: signals.map((signal) => signal.label),
    confidence: confidenceForRisk(riskLevel),
  });
}

export function mergeScamResults(
  first: ScamCheckResult,
  second: ScamCheckResult,
): ScamCheckResult {
  const riskLevel =
    RISK_RANK[first.risk_level] >= RISK_RANK[second.risk_level]
      ? first.risk_level
      : second.risk_level;

  const reasons = Array.from(
    new Set(
      [first.reason, second.reason]
        .map((reason) => reason.trim())
        .filter(Boolean),
    ),
  );
  const signals = Array.from(
    new Set([...(first.signals ?? []), ...(second.signals ?? [])]),
  );
  const confidence = Math.max(first.confidence ?? 60, second.confidence ?? 60);

  return normalizeScamResult({
    is_safe: riskLevel === "Low",
    risk_level: riskLevel,
    reason: reasons.join(" "),
    signals,
    confidence,
  });
}
