import { z } from "zod";
import { registerUser } from "../../../../../lib/auth-service";
import { handleError, jsonOk, parseJson } from "../../../../../lib/http";
import {
  enforceRateLimit,
  requestRateLimitKey,
} from "../../../../../lib/rate-limit";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const hrdRegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter.")
    .max(150, "Nama maksimal 150 karakter."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(190, "Email maksimal 190 karakter.")
    .pipe(z.email("Format email tidak valid.")),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter.")
    .max(72, "Password maksimal 72 karakter."),
  companyName: z
    .string()
    .trim()
    .min(2, "Nama perusahaan minimal 2 karakter.")
    .max(150, "Nama perusahaan maksimal 150 karakter."),
  legalNumber: z
    .string()
    .trim()
    .min(2, "Nomor legal perusahaan wajib diisi.")
    .max(50, "Nomor legal maksimal 50 karakter."),
  phone: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(6, "Nomor telepon minimal 6 karakter.")
      .max(30, "Nomor telepon maksimal 30 karakter.")
      .optional(),
  ),
  portfolioUrl: z.preprocess(
    emptyToUndefined,
    z.url("URL portofolio tidak valid.").max(255).optional(),
  ),
});

export async function POST(request: Request) {
  try {
    // Maksimal 10 registrasi per jam per IP (candidate + HRD berbagi kuota).
    enforceRateLimit(
      requestRateLimitKey(request, "register"),
      10,
      60 * 60 * 1000,
    );

    const input = await parseJson(request, hrdRegisterSchema);
    const result = await registerUser({
      role: "hrd",
      ...input,
    });

    return jsonOk(
      {
        user: result.user,
        email_sent: result.emailSent,
        message:
          "Registrasi HRD berhasil. Verifikasi email perusahaan sebelum login.",
      },
      { status: 201 },
    );
  } catch (error) {
    return handleError(error);
  }
}
