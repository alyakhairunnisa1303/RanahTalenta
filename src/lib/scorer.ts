import { z, type ZodType } from "zod";
import { env } from "./env";
import { aiUnavailable, AppError } from "./errors";
import * as mockScoring from "./scoring.mock";
import type {
  CvValidationResult,
  JobScamCheckResult,
  ScoreOutput,
} from "./types";

type ScoringModule = {
  checkJobScam(
    text: string,
  ): JobScamCheckResult | Promise<JobScamCheckResult>;
  validateCv(text: string): CvValidationResult | Promise<CvValidationResult>;
  scoreCandidate(
    jd: string,
    cvAnon: string,
    mustHave: string[],
  ): ScoreOutput | Promise<ScoreOutput>;
};

const scamSchema = z.object({
  is_safe: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

const cvSchema = z.object({
  is_valid_cv: z.boolean(),
  reason: z.string().trim().max(500).optional(),
});

const scoreSchema = z.object({
  total: z.number().int().min(0).max(100),
  sim: z.number().int().min(0).max(100),
  mustScore: z.number().int().min(0).max(100),
  skor_kompetensi: z.number().int().min(0).max(100),
  missing: z.array(z.string().trim().min(1).max(300)).max(50),
  kekuatan: z
    .array(
      z.object({
        poin: z.string().trim().min(1).max(300),
        bukti: z.string().trim().min(1).max(2000),
      }),
    )
    .max(30),
  celah: z.array(z.string().trim().min(1).max(500)).max(50),
  candidateFeedback: z.string().trim().min(1).max(5000),
  pertanyaan_wawancara: z
    .array(z.string().trim().min(1).max(1000))
    .length(3, "Harus berisi tepat 3 pertanyaan."),
});

function loadAiModule(): ScoringModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- modul AI diisi oleh tim AI setelah backend selesai.
    const aiModule = require("./scoring") as Partial<ScoringModule>;

    if (
      typeof aiModule.checkJobScam !== "function" ||
      typeof aiModule.validateCv !== "function" ||
      typeof aiModule.scoreCandidate !== "function"
    ) {
      throw new Error("Ekspor modul AI tidak lengkap.");
    }

    return aiModule as ScoringModule;
  } catch (error) {
    console.error(
      "[SCORER] Modul AI tidak dapat dimuat:",
      error instanceof Error ? error.message : error,
    );
    throw aiUnavailable(
      "Modul AI belum tersedia. Gunakan USE_MOCK=true atau hubungi tim AI.",
    );
  }
}

async function runWithAi<T>(
  call: (aiModule: ScoringModule) => T | Promise<T>,
  schema: ZodType<T>,
): Promise<T> {
  const aiModule = env.USE_MOCK ? mockScoring : loadAiModule();

  let raw: unknown;
  try {
    raw = await call(aiModule);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error(
      "[SCORER] Modul AI gagal memproses permintaan:",
      error instanceof Error ? error.message : error,
    );
    throw aiUnavailable("Modul AI gagal memproses permintaan.");
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "[SCORER] Output modul AI tidak valid:",
      parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; "),
    );
    throw aiUnavailable("Output modul AI tidak valid.");
  }

  return parsed.data;
}

export async function checkJobScam(text: string): Promise<JobScamCheckResult> {
  return runWithAi((aiModule) => aiModule.checkJobScam(text), scamSchema);
}

export async function validateCv(text: string): Promise<CvValidationResult> {
  return runWithAi((aiModule) => aiModule.validateCv(text), cvSchema);
}

export async function scoreCandidate(
  jd: string,
  cvAnon: string,
  mustHave: string[],
): Promise<ScoreOutput> {
  return runWithAi(
    (aiModule) => aiModule.scoreCandidate(jd, cvAnon, mustHave),
    scoreSchema,
  );
}
