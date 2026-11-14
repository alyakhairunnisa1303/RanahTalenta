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
  "throwawaymail.com",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  return BIG_COMPANY_PATTERN.test(companyName);
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
    .filter((token) => token.length >= 4 && !COMPANY_STOPWORDS.has(token));
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

function riskFromSignals(signals: TrustSignal[]): RiskLevel {
  if (signals.some((signal) => signal.severity === "High")) return "High";
  if (signals.some((signal) => signal.severity === "Medium")) return "Medium";
  return "Low";
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

  const riskLevel = riskFromSignals(signals);

  return normalizeScamResult({
    is_safe: riskLevel === "Low",
    risk_level: riskLevel,
    reason: reasonFromSignals(
      signals,
      "Tidak ada indikasi penipuan yang jelas.",
    ),
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

  return normalizeScamResult({
    is_safe: riskLevel === "Low",
    risk_level: riskLevel,
    reason: reasons.join(" "),
  });
}

