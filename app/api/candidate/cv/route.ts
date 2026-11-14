import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { inTransaction, query } from "@/src/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Akses pelamar diperlukan." }, { status: 403 });
  try {
    const result = await query<{ cv_text: string }>("SELECT cv_text FROM candidate_profiles WHERE candidate_id = $1", [user.id]);
    const cvText = result.rows[0]?.cv_text;
    return cvText ? NextResponse.json({ cv_text: cvText }, { headers: { "Cache-Control": "private, no-store" } }) : NextResponse.json({ error: "CV belum diunggah." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "CV gagal dimuat." }, { status: 503 });
  }
}

const cvSchema = z.object({ cv_text: z.string().trim().min(100).max(100_000) });

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Akses pelamar diperlukan." }, { status: 403 });
  const parsed = cvSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Teks CV tidak valid." }, { status: 400 });
  try {
    await query(
      `INSERT INTO candidate_profiles (candidate_id, cv_text) VALUES ($1, $2)
       ON CONFLICT (candidate_id) DO UPDATE SET cv_text = EXCLUDED.cv_text, updated_at = NOW()`,
      [user.id, parsed.data.cv_text],
    );
    return NextResponse.json({ saved: true });
  } catch {
    return NextResponse.json({ error: "CV gagal disimpan." }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Akses pelamar diperlukan." }, { status: 403 });

  try {
    const deleted = await inTransaction(async (client) => {
      const running = await client.query(
        `SELECT id FROM applications
         WHERE candidate_id = $1 AND screening_status = 'processing'
         FOR UPDATE`,
        [user.id],
      );
      if (running.rowCount) return false;

      await client.query(
        `UPDATE applications SET screening_status = 'not_started', screening_step = 0,
           screening_started_at = NULL, screening_completed_at = NULL, screening_error = NULL
         WHERE candidate_id = $1`,
        [user.id],
      );
      await client.query(
        `UPDATE job_matches SET match_score = 0, candidate_feedback = '',
           hr_strengths = '[]'::jsonb, hr_gaps = '[]'::jsonb,
           interview_questions = '[]'::jsonb, ai_confidence = 0,
           ai_evidence = '[]'::jsonb, ai_criteria_scores = '{}'::jsonb
         WHERE candidate_id = $1`,
        [user.id],
      );
      await client.query("DELETE FROM candidate_profiles WHERE candidate_id = $1", [user.id]);
      return true;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Screening sedang berjalan. Coba hapus CV kembali setelah proses selesai." }, { status: 409 });
    }
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "CV dan hasil screening gagal dihapus." }, { status: 503 });
  }
}
