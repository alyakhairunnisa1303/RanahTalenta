import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

const scheduleSchema = z.object({
  application_id: z.number().int().positive(),
  scheduled_at: z.iso.datetime(),
  meeting_url: z.string().trim().max(2048).refine((value) => !value || /^https:\/\//i.test(value), "Tautan pertemuan harus HTTPS."),
  notes: z.string().trim().max(4000),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  try {
    const result = await query(
      `SELECT i.id, i.application_id, i.scheduled_at, i.meeting_url, i.notes, i.status,
              i.candidate_response, i.reschedule_message, i.reschedule_requested_at,
              a.job_id, j.title AS job_title,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(d.applicant_name, u.name) ELSE 'Kandidat #' || LPAD(a.id::text, 3, '0') END AS candidate_name,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(NULLIF(d.applicant_email, ''), u.email) ELSE NULL END AS candidate_email,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(NULLIF(d.applicant_phone, ''), u.phone) ELSE NULL END AS candidate_phone,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(NULLIF(d.portfolio_url, ''), u.portfolio_url) ELSE NULL END AS portfolio_url
       FROM interviews i JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id AND j.hrd_id = $1
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN application_documents d ON d.application_id = a.id
       ORDER BY i.scheduled_at ASC`,
      [user.id],
    );
    return NextResponse.json({ interviews: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Jadwal gagal dimuat. Jalankan npm run db:setup terlebih dahulu." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data jadwal tidak valid." }, { status: 400 });
  try {
    const result = await query(
      `INSERT INTO interviews (application_id, scheduled_at, meeting_url, notes)
       SELECT a.id, $3, $4, $5 FROM applications a
       JOIN jobs j ON j.id = a.job_id AND j.hrd_id = $1
       WHERE a.id = $2 AND a.status = 'shortlisted'
       ON CONFLICT (application_id) DO UPDATE SET scheduled_at = EXCLUDED.scheduled_at,
         meeting_url = EXCLUDED.meeting_url, notes = EXCLUDED.notes, status = 'scheduled',
         candidate_response = 'pending', reschedule_message = '', reschedule_requested_at = NULL, updated_at = NOW()
       RETURNING id, application_id, scheduled_at, meeting_url, notes, status`,
      [user.id, parsed.data.application_id, parsed.data.scheduled_at, parsed.data.meeting_url, parsed.data.notes],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Kandidat tidak ditemukan atau belum masuk shortlist." }, { status: 404 });
    return NextResponse.json({ interview: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Jadwal gagal disimpan." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null;
  if (!Number.isSafeInteger(body?.id) || !["completed", "cancelled", "scheduled"].includes(String(body?.status))) {
    return NextResponse.json({ error: "Status jadwal tidak valid." }, { status: 400 });
  }
  try {
    const result = await query(
      `UPDATE interviews i SET status = $3, updated_at = NOW()
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE i.application_id = a.id AND i.id = $1 AND j.hrd_id = $2
       RETURNING i.id`,
      [body?.id, user.id, body?.status],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Jadwal tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Status jadwal gagal diperbarui." }, { status: 503 });
  }
}
