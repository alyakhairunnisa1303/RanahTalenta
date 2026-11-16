import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { inTransaction, query } from "@/src/lib/db";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/src/lib/security";
import type { Application, JobMatch } from "@/src/types/hirematch";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const extensions = new Set([".pdf", ".doc", ".docx", ".txt"]);
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  try {
    const result = user.role === "candidate"
      ? await query<Application>("SELECT a.id, a.job_match_id, a.candidate_id, a.job_id, a.status, a.screening_status, a.screening_completed_at::text AS screening_completed_at, a.screening_error, a.applied_at::text AS applied_at, jm.match_score FROM applications a JOIN job_matches jm ON jm.id = a.job_match_id WHERE a.candidate_id = $1 ORDER BY a.applied_at DESC", [user.id])
      : await query<Application>("SELECT a.id, a.job_match_id, a.candidate_id, a.job_id, a.status, a.screening_status, a.screening_completed_at::text AS screening_completed_at, a.screening_error, a.applied_at::text AS applied_at, jm.match_score FROM applications a JOIN jobs j ON j.id = a.job_id JOIN job_matches jm ON jm.id = a.job_match_id WHERE j.hrd_id = $1 ORDER BY a.applied_at DESC", [user.id]);
    return NextResponse.json({ applications: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lamaran gagal dimuat." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Hanya pelamar yang dapat mengirim lamaran." }, { status: 403 });

  const limit = checkRateLimit(`apply:${clientKey(request)}:${user.id}`, 10);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak lamaran. Coba lagi nanti." }, { status: 429, headers: rateLimitHeaders(limit) });
  if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "Ukuran permintaan maksimal 6 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Data formulir tidak valid." }, { status: 400 });
  }
  const jobId = Number(form.get("jobId"));
  const applicantName = String(form.get("name") ?? "").trim().slice(0, 160);
  const applicantEmail = String(form.get("email") ?? "").trim().slice(0, 254);
  const applicantPhone = String(form.get("phone") ?? "").trim().slice(0, 32);
  const portfolioUrl = String(form.get("portfolioUrl") ?? "").trim().slice(0, 2048);
  const coverLetter = String(form.get("coverLetter") ?? "").trim();
  const accepted = form.get("acceptedRequirements") === "true" && form.get("confirmedTruth") === "true";
  const validPhone = /^[0-9+\-\s()]{8,20}$/.test(applicantPhone);
  const validPortfolio = !portfolioUrl || /^https?:\/\//i.test(portfolioUrl);
  if (!Number.isSafeInteger(jobId) || jobId < 1 || applicantName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicantEmail) || !validPhone || !validPortfolio || coverLetter.length > 10_000 || !accepted) {
    return NextResponse.json({ error: "Data lamaran tidak valid." }, { status: 400 });
  }

  const uploaded = form.get("file");
  let file: { name: string; type: string; bytes: Uint8Array; extension: string } | null = null;
  if (uploaded instanceof File && uploaded.size > 0) {
    const extension = path.extname(uploaded.name).toLowerCase();
    if (!extensions.has(extension)) return NextResponse.json({ error: "Format harus PDF, DOC, DOCX, atau TXT." }, { status: 415 });
    if (uploaded.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Ukuran dokumen maksimal 5 MB." }, { status: 413 });
    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    const startsWith = (prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
    const valid = extension === ".pdf" ? new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-"
      : extension === ".doc" ? startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
        : extension === ".docx" ? startsWith([0x50, 0x4b, 0x03, 0x04]) : !bytes.includes(0);
    if (!valid) return NextResponse.json({ error: "Isi berkas tidak cocok dengan format yang dipilih." }, { status: 415 });
    const name = uploaded.name.split(/[\\/]/).pop()?.replace(/[\r\n\0]/g, "").slice(0, 180) || `surat-lamaran${extension}`;
    const types: Record<string, string> = { ".pdf": "application/pdf", ".doc": "application/msword", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".txt": "text/plain; charset=utf-8" };
    file = { name, type: types[extension], bytes, extension };
  }
  if (coverLetter.length < 30 && !file) return NextResponse.json({ error: "Isi surat minimal 30 karakter atau lampirkan dokumen." }, { status: 400 });

  try {
    const existing = await query("SELECT id FROM applications WHERE candidate_id = $1 AND job_id = $2", [user.id, jobId]);
    if (existing.rowCount) return NextResponse.json({ error: "Anda sudah melamar lowongan ini." }, { status: 409 });
    const jobResult = await query("SELECT id FROM jobs WHERE id = $1 AND status = 'open'", [jobId]);
    if (!jobResult.rowCount) return NextResponse.json({ error: "Lowongan sudah tidak tersedia." }, { status: 404 });
    const source = await query<{ cv_text: string }>(
      "SELECT cv_text FROM candidate_profiles WHERE candidate_id = $1",
      [user.id],
    );
    if (!source.rows[0]?.cv_text) return NextResponse.json({ error: "Unggah CV melalui dashboard sebelum melamar." }, { status: 400 });

  const documentDirectory = path.resolve(/*turbopackIgnore: true*/ process.env.APPLICATION_DOCUMENTS_DIR || path.join(process.cwd(), "data", "application-documents"));
  let storedPath: string | null = null;
  try {
    const application = await inTransaction(async (client) => {
      const job = await client.query("SELECT id FROM jobs WHERE id = $1 AND status = 'open'", [jobId]);
      if (!job.rowCount) throw new Error("JOB_NOT_FOUND");
      const match = await client.query<JobMatch>(
        `INSERT INTO job_matches (candidate_id, job_id, match_score, candidate_feedback, hr_strengths, hr_gaps, interview_questions)
         VALUES ($1, $2, 0, 'Menunggu HRD memulai screening AI.', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
         ON CONFLICT (candidate_id, job_id) DO UPDATE SET match_score = 0,
           candidate_feedback = 'Menunggu HRD memulai screening AI.', hr_strengths = '[]'::jsonb,
           hr_gaps = '[]'::jsonb, interview_questions = '[]'::jsonb, created_at = NOW()
         RETURNING id`,
         [user.id, jobId],
      );
      const applicationResult = await client.query<Application>(
        `INSERT INTO applications (job_match_id, candidate_id, job_id, screening_status)
         VALUES ($1, $2, $3, 'not_started')
         RETURNING id, job_match_id, candidate_id, job_id, status, screening_status, applied_at::text AS applied_at`,
        [match.rows[0].id, user.id, jobId],
      );
      const created = applicationResult.rows[0];
      if (file) {
        await mkdir(documentDirectory, { recursive: true });
        storedPath = path.join(/*turbopackIgnore: true*/ documentDirectory, `${created.id}${file.extension}`);
        await writeFile(storedPath, file.bytes, { flag: "wx" });
      }
      await client.query(
        `INSERT INTO application_documents (application_id, applicant_name, applicant_email, applicant_phone, portfolio_url, cover_letter, file_name, file_type, file_size, file_path)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [created.id, applicantName, applicantEmail, applicantPhone || null, portfolioUrl || null, coverLetter, file?.name ?? null, file?.type ?? null, file?.bytes.byteLength ?? 0, storedPath],
      );
      return created;
    });
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    if (storedPath) {
      const { unlink } = await import("node:fs/promises");
      await unlink(storedPath).catch(() => undefined);
    }
    if (error instanceof Error && error.message === "JOB_NOT_FOUND") return NextResponse.json({ error: "Lowongan sudah tidak tersedia." }, { status: 404 });
    if ((error as { code?: string }).code === "23505") return NextResponse.json({ error: "Anda sudah melamar lowongan ini." }, { status: 409 });
    return NextResponse.json({ error: "Lamaran gagal disimpan ke database." }, { status: 500 });
  }
  } catch {
    return NextResponse.json({ error: "Lamaran gagal disimpan. Periksa koneksi database." }, { status: 503 });
  }
}
