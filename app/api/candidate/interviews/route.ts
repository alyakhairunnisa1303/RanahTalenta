import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

const responseSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("reschedule"), message: z.string().trim().min(5).max(1000) }),
]);

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Akses pelamar diperlukan." }, { status: 403 });
  try {
    const result = await query(
      `SELECT i.id, i.scheduled_at, i.meeting_url, i.notes, i.status,
              i.candidate_response, i.reschedule_message, i.reschedule_requested_at,
              j.title AS job_title, h.company_name
       FROM interviews i JOIN applications a ON a.id = i.application_id
       JOIN jobs j ON j.id = a.job_id JOIN users h ON h.id = j.hrd_id
       WHERE a.candidate_id = $1 ORDER BY i.scheduled_at DESC`,
      [user.id],
    );
    return NextResponse.json({ interviews: result.rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Jadwal interview gagal dimuat." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Akses pelamar diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null) as { id?: unknown; action?: unknown; message?: unknown } | null;
  const id = z.number().int().positive().safeParse(body?.id);
  const response = responseSchema.safeParse({ action: body?.action, message: body?.message });
  if (!id.success || !response.success) return NextResponse.json({ error: "Respons wawancara tidak valid." }, { status: 400 });
  try {
    const isReschedule = response.data.action === "reschedule";
    const message = response.data.action === "reschedule" ? response.data.message : "";
    const result = await query(
      `UPDATE interviews i SET
         candidate_response = $3,
         reschedule_message = $4,
         reschedule_requested_at = CASE WHEN $3 = 'reschedule_requested' THEN NOW() ELSE NULL END,
         updated_at = NOW()
       FROM applications a
       WHERE i.application_id = a.id AND i.id = $1 AND a.candidate_id = $2
         AND i.status = 'scheduled' AND i.candidate_response = 'pending'
       RETURNING i.id, i.candidate_response, i.reschedule_message, i.reschedule_requested_at`,
      [id.data, user.id, isReschedule ? "reschedule_requested" : "confirmed", message],
    );
    if (!result.rowCount) {
      const existing = await query(
        `SELECT i.id FROM interviews i JOIN applications a ON a.id = i.application_id
         WHERE i.id = $1 AND a.candidate_id = $2 AND i.status = 'scheduled'`,
        [id.data, user.id],
      );
      return existing.rowCount
        ? NextResponse.json({ error: "Anda sudah mengirim respons untuk jadwal ini." }, { status: 409 })
        : NextResponse.json({ error: "Jadwal aktif tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ interview: result.rows[0] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Respons wawancara gagal disimpan." }, { status: 503 });
  }
}
