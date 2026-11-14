import { AppError } from "./errors";

// Domain email publik yang tidak boleh dipakai mendaftar sebagai HRD.
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "ymail.com",
  "proton.me",
]);

export function getEmailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "" : email.slice(at + 1).trim().toLowerCase();
}

export function isPublicEmailDomain(email: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(getEmailDomain(email));
}

export function ensureCompanyEmail(email: string): void {
  if (isPublicEmailDomain(email)) {
    throw new AppError(
      400,
      "PUBLIC_EMAIL_NOT_ALLOWED",
      "Email HRD tidak boleh memakai domain publik (Gmail, Yahoo, Outlook, Hotmail, iCloud, Ymail, Proton). Gunakan email perusahaan.",
    );
  }
}
