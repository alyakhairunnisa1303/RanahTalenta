// Error aplikasi dengan status HTTP dan kode yang konsisten.
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSec?: number;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { cause?: unknown; retryAfterSec?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.retryAfterSec = options?.retryAfterSec;
  }
}

export function badRequest(message = "Permintaan tidak valid.") {
  return new AppError(400, "BAD_REQUEST", message);
}

export function unauthorized(message = "Silakan login terlebih dahulu.") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function invalidCredentials() {
  return new AppError(401, "INVALID_CREDENTIALS", "Email atau password salah.");
}

export function forbidden(message = "Anda tidak memiliki akses untuk aksi ini.") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Data tidak ditemukan.") {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message = "Data sudah ada.") {
  return new AppError(409, "CONFLICT", message);
}

export function payloadTooLarge(message = "Ukuran file terlalu besar.") {
  return new AppError(413, "PAYLOAD_TOO_LARGE", message);
}

export function tooManyRequests(
  message = "Terlalu banyak percobaan. Silakan coba lagi nanti.",
  retryAfterSec = 60,
) {
  return new AppError(429, "TOO_MANY_REQUESTS", message, { retryAfterSec });
}

export function emailNotVerified() {
  return new AppError(
    403,
    "EMAIL_NOT_VERIFIED",
    "Akun belum diverifikasi. Cek email atau tautan verifikasi.",
  );
}

export function aiUnavailable(message = "Modul AI belum tersedia.") {
  return new AppError(503, "AI_UNAVAILABLE", message);
}

export function mailUnavailable(message = "Layanan email belum dikonfigurasi.") {
  return new AppError(503, "MAIL_UNAVAILABLE", message);
}

export function internalError(message = "Terjadi kesalahan pada server.") {
  return new AppError(500, "INTERNAL_ERROR", message);
}
