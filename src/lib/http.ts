import { unstable_rethrow } from "next/navigation";
import { ZodError, type ZodType } from "zod";
import { AppError, badRequest, internalError } from "./errors";
import type { ApiFailure, ApiSuccess } from "./types";

// Semua respons API tidak boleh di-cache (berisi data sesi/pribadi).
export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");

  const body: ApiSuccess<T> = { ok: true, data };
  return Response.json(body, { ...init, headers });
}

export function jsonError(error: AppError): Response {
  const headers = new Headers();
  headers.set("Cache-Control", "no-store");
  if (error.retryAfterSec) {
    headers.set("Retry-After", String(error.retryAfterSec));
  }

  const body: ApiFailure = {
    ok: false,
    error: { code: error.code, message: error.message },
  };
  return Response.json(body, { status: error.status, headers });
}

// Bungkus error tak terduga agar detail internal tidak bocor ke klien.
export function handleError(error: unknown): Response {
  // Next.js memakai error internal untuk prerender/redirect; jangan ditelan.
  unstable_rethrow(error);

  if (error instanceof AppError) {
    return jsonError(error);
  }

  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    return jsonError(
      new AppError(400, "VALIDATION_ERROR", `Input tidak valid: ${message}`),
    );
  }

  console.error("[API] Unhandled error:", error);
  return jsonError(internalError());
}

// Parsing JSON + validasi Zod dalam satu langkah. ZodError ditangani handleError.
export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("Body request harus berupa JSON yang valid.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

// Catatan: x-forwarded-for bisa dipalsukan jika server tidak berada di belakang
// proxy tepercaya. Untuk rate limit sederhana ini cukup; jangan dipakai sebagai
// bukti identitas.
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
