import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";
import type { ApplicationDocumentRecord } from "@/src/lib/application-documents";

export async function GET(_request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  const applicationId = Number((await params).applicationId);
  if (!Number.isSafeInteger(applicationId) || applicationId < 1) return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  try {
    const result = await query<ApplicationDocumentRecord>(
      `SELECT a.id AS application_id, a.candidate_id, a.job_id,
              d.applicant_name, d.applicant_email, d.applicant_phone, d.portfolio_url,
              d.cover_letter, d.file_name, d.file_type, d.file_size, d.updated_at
       FROM applications a JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN application_documents d ON d.application_id = a.id
       WHERE a.id = $1 AND (a.candidate_id = $2 OR (j.hrd_id = $2 AND $3 = 'hrd' AND a.status = 'shortlisted'))`,
      [applicationId, user.id, user.role],
    );
    const row = result.rows[0];
    if (!row) return NextResponse.json({ error: "Lampiran tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Lampiran gagal dibaca." }, { status: 503 });
  }
}
