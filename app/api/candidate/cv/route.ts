import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

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
