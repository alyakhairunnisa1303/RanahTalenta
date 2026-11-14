import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";
import type { Job } from "@/src/types/hirematch";

const jobSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(20_000),
  requirements: z.string().trim().max(10_000),
  location: z.string().trim().min(2).max(200),
  salary_range: z.string().trim().max(200).nullable().optional(),
});

export async function GET() {
  try {
    const user = await getCurrentUser();
    const result = user?.role === "hrd"
      ? await query<Job>("SELECT j.id, j.hrd_id, j.title, j.description, j.requirements, j.location, j.salary_range, j.status, j.created_at::date::text AS created_at, u.company_name, u.industry AS company_industry, u.email AS company_email, u.legal_number AS company_legal_number, u.is_verified AS company_is_verified FROM jobs j JOIN users u ON u.id = j.hrd_id WHERE j.hrd_id = $1 ORDER BY j.created_at DESC", [user.id])
      : await query<Job>("SELECT j.id, j.hrd_id, j.title, j.description, j.requirements, j.location, j.salary_range, j.status, j.created_at::date::text AS created_at, u.company_name, u.industry AS company_industry, u.email AS company_email, NULL::text AS company_legal_number, u.is_verified AS company_is_verified FROM jobs j JOIN users u ON u.id = j.hrd_id WHERE j.status = 'open' ORDER BY j.created_at DESC");
    return NextResponse.json({ jobs: result.rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lowongan gagal dimuat. Periksa koneksi database." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Hanya akun HRD yang dapat membuat lowongan." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Data lowongan tidak valid." }, { status: 400 });

  try {
    const result = await query<Job>(
      `INSERT INTO jobs (hrd_id, title, description, requirements, location, salary_range)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, hrd_id, title, description, requirements, location, salary_range, status, created_at::date::text AS created_at`,
      [user.id, parsed.data.title, parsed.data.description, parsed.data.requirements, parsed.data.location, parsed.data.salary_range || null],
    );
    return NextResponse.json({ job: result.rows[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Lowongan gagal disimpan." }, { status: 500 });
  }
}
