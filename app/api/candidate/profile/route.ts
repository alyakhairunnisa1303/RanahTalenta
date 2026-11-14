import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

const profileSchema = z.object({
  portfolio_url: z.string().trim().max(2048).refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Masukkan tautan portofolio yang valid (http atau https)."),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "candidate") return NextResponse.json({ error: "Akses pelamar diperlukan." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Tautan portofolio tidak valid." }, { status: 400 });
  }

  try {
    const result = await query(
      `UPDATE users SET portfolio_url = $2
       WHERE id = $1 AND role = 'candidate'
       RETURNING id, name, email, role, company_name, industry, legal_number, phone, portfolio_url, is_verified`,
      [user.id, parsed.data.portfolio_url || null],
    );
    if (!result.rowCount) return NextResponse.json({ error: "Profil pelamar tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ user: result.rows[0] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Tautan portofolio gagal disimpan." }, { status: 503 });
  }
}
