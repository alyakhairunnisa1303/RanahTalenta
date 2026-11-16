import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";
import type { Job } from "@/src/types/hirematch";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId: rawId } = await params;
  const jobId = Number(rawId);
  if (!Number.isSafeInteger(jobId) || jobId < 1) return NextResponse.json({ error: "ID lowongan tidak valid." }, { status: 400 });
  try {
    const user = await getCurrentUser();
    const result = user?.role === "hrd"
      ? await query<Job>("SELECT j.id, j.hrd_id, j.title, j.description, j.requirements, j.location, j.salary_range, j.status, j.created_at::date::text AS created_at, u.company_name, u.industry AS company_industry, u.email AS company_email, u.legal_number AS company_legal_number, u.is_verified AS company_is_verified FROM jobs j JOIN users u ON u.id = j.hrd_id WHERE j.id = $1 AND j.hrd_id = $2", [jobId, user.id])
      : await query<Job>("SELECT j.id, j.hrd_id, j.title, j.description, j.requirements, j.location, j.salary_range, j.status, j.created_at::date::text AS created_at, u.company_name, u.industry AS company_industry, u.email AS company_email, NULL::text AS company_legal_number, u.is_verified AS company_is_verified FROM jobs j JOIN users u ON u.id = j.hrd_id WHERE j.id = $1 AND j.status = 'open'", [jobId]);
    const job = result.rows[0];
    return job ? NextResponse.json({ job }) : NextResponse.json({ error: "Lowongan tidak ditemukan." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Lowongan gagal dimuat." }, { status: 503 });
  }
}
