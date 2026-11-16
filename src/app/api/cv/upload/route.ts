import { connection } from "next/server";
import { requireRole } from "../../../../lib/auth";
import { prisma } from "../../../../lib/db";
import {
  badRequest,
  payloadTooLarge,
  unauthorized,
} from "../../../../lib/errors";
import {
  extractPdfText,
  hasPdfMagicBytes,
  MAX_CV_BYTES,
  MIN_CV_TEXT_CHARS,
} from "../../../../lib/extract";
import { handleError, jsonOk } from "../../../../lib/http";
import { runMatchingForCandidate } from "../../../../lib/matching";
import { enforceRateLimit } from "../../../../lib/rate-limit";
import { validateCv } from "../../../../lib/scorer";
import { deleteCvFile, saveCvFile } from "../../../../lib/storage";

export async function POST(request: Request) {
  try {
    await connection();

    const session = await requireRole("candidate");
    enforceRateLimit(`cv-upload:user:${session.userId}`, 10, 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, cvPath: true },
    });

    if (!user) {
      throw unauthorized("Sesi tidak valid. Silakan login kembali.");
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw badRequest(
        "Body harus multipart/form-data dengan file pada field 'cv'.",
      );
    }

    const file = form.get("cv");
    if (!(file instanceof File)) {
      throw badRequest("File CV wajib dikirim pada field 'cv'.");
    }

    if (file.size === 0) {
      throw badRequest("File CV kosong.");
    }
    if (file.size > MAX_CV_BYTES) {
      throw payloadTooLarge("Ukuran CV maksimal 5 MB.");
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      throw badRequest("CV harus berformat PDF.");
    }

    const mime = file.type.split(";")[0].trim().toLowerCase();
    if (mime !== "application/pdf") {
      throw badRequest("MIME type CV harus application/pdf.");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_CV_BYTES) {
      throw payloadTooLarge("Ukuran CV maksimal 5 MB.");
    }
    if (!hasPdfMagicBytes(buffer)) {
      throw badRequest("File bukan PDF yang valid.");
    }

    let text: string;
    try {
      text = await extractPdfText(buffer);
    } catch (error) {
      console.error(
        "[CV] Gagal mengekstrak PDF:",
        error instanceof Error ? error.message : error,
      );
      throw badRequest("PDF tidak dapat dibaca. Pastikan file tidak rusak.");
    }

    const compactText = text.replace(/\s+/g, " ").trim();
    if (compactText.length < MIN_CV_TEXT_CHARS) {
      throw badRequest(
        "Teks CV terlalu sedikit. Gunakan PDF berbasis teks, bukan hasil scan.",
      );
    }

    const validation = await validateCv(text);
    if (!validation.is_valid_cv) {
      throw badRequest(
        validation.reason ?? "CV tidak valid. Periksa kembali isi CV Anda.",
      );
    }

    let newPath: string | null = null;
    try {
      newPath = await saveCvFile(buffer);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          cvPath: newPath,
          cvText: text,
        },
      });
    } catch (error) {
      if (newPath) {
        await deleteCvFile(newPath).catch(() => undefined);
      }
      throw error;
    }

    if (user.cvPath && user.cvPath !== newPath) {
      await deleteCvFile(user.cvPath).catch((error: unknown) => {
        console.error(
          "[CV] Gagal menghapus file CV lama:",
          error instanceof Error ? error.message : error,
        );
      });
    }

    const matching = await runMatchingForCandidate(user.id, user.name, text);

    return jsonOk({
      message: "CV berhasil diunggah dan dianalisis.",
      cv: {
        has_cv: true,
        characters: text.length,
      },
      ...matching,
    });
  } catch (error) {
    return handleError(error);
  }
}
