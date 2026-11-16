import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

const profileSchema = z.object({
  company_name: z.string().trim().min(2).max(200),
  industry: z.string().trim().min(2).max(120),
  legal_number: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(32).refine((value) => !value || /^[0-9+\-\s()]{8,20}$/.test(value), "Nomor telepon tidak valid."),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Nama perusahaan, legalitas, atau nomor telepon tidak valid." }, { status: 400 });
  try {
    const result = await query(
      `UPDATE users SET company_name = $2, industry = $3, legal_number = $4, phone = NULLIF($5, '')
       WHERE id = $1 AND role = 'hrd'
       RETURNING id, name, email, role, company_name, industry, legal_number, phone, portfolio_url, is_verified`,
      [user.id, parsed.data.company_name, parsed.data.industry, parsed.data.legal_number, parsed.data.phone],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Profil perusahaan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ user: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Profil perusahaan gagal disimpan." }, { status: 503 });
  }
}
