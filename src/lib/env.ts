import { z } from "zod";

// Validasi environment sekali di awal. Pesan sengaja tidak mencetak nilai
// supaya secret tidak bocor ke log.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "wajib diisi"),
  AUTH_SECRET: z.string().min(32, "minimal 32 karakter"),
  APP_URL: z.url().default("http://localhost:3000"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  USE_MOCK: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  GEMINI_API_KEY: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  SMTP_HOST: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  SMTP_USER: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
  SMTP_PASS: z
    .string()
    .optional()
    .transform((value) => value || undefined),
  SMTP_FROM: z
    .string()
    .trim()
    .min(1)
    .default("HireMatch AI <no-reply@hirematch.local>"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

  throw new Error(
    `Konfigurasi environment tidak valid: ${detail}. Periksa .env.local (contoh di .env.example).`,
  );
}

export const env = parsed.data;
