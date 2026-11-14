import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

const settingsSchema = z.object({
  skill_weight: z.number().int().min(0).max(100),
  experience_weight: z.number().int().min(0).max(100),
  education_weight: z.number().int().min(0).max(100),
  review_threshold: z.number().int().min(0).max(100),
}).refine((settings) => settings.skill_weight + settings.experience_weight + settings.education_weight === 100, {
  message: "Total bobot harus 100%.",
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  try {
    await query(
      `INSERT INTO hrd_ai_settings (hrd_id) VALUES ($1) ON CONFLICT (hrd_id) DO NOTHING`,
      [user.id],
    );
    const settings = await query("SELECT skill_weight, experience_weight, education_weight, review_threshold FROM hrd_ai_settings WHERE hrd_id = $1", [user.id]);
    return NextResponse.json({ settings: settings.rows[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Pengaturan AI gagal dimuat. Jalankan npm run db:setup terlebih dahulu." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Pastikan total bobot tepat 100% dan ambang berada di rentang 0–100%." }, { status: 400 });
  try {
    const { skill_weight, experience_weight, education_weight, review_threshold } = parsed.data;
    const result = await query(
      `INSERT INTO hrd_ai_settings (hrd_id, skill_weight, experience_weight, education_weight, review_threshold)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hrd_id) DO UPDATE SET skill_weight = EXCLUDED.skill_weight,
         experience_weight = EXCLUDED.experience_weight, education_weight = EXCLUDED.education_weight,
         review_threshold = EXCLUDED.review_threshold, updated_at = NOW()
       RETURNING skill_weight, experience_weight, education_weight, review_threshold, updated_at`,
      [user.id, skill_weight, experience_weight, education_weight, review_threshold],
    );
    return NextResponse.json({ settings: result.rows[0] });
  } catch {
    return NextResponse.json({ error: "Pengaturan AI gagal disimpan." }, { status: 503 });
  }
}
