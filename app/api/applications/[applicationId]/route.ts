import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

const statusSchema = z.object({ status: z.enum(["pending", "shortlisted", "rejected"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ applicationId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  const id = Number((await params).applicationId);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Status lamaran tidak valid." }, { status: 400 });

  try {
    const result = await query(
      `UPDATE applications a SET status = $1
       FROM jobs j WHERE a.id = $2 AND a.job_id = j.id AND j.hrd_id = $3
       RETURNING a.id, a.job_match_id, a.candidate_id, a.job_id, a.status, a.applied_at::text AS applied_at`,
      [parsed.data.status, id, user.id],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ application: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Status lamaran gagal diperbarui." }, { status: 500 });
  }
}
