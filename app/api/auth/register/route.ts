import { NextResponse } from "next/server";
import { z } from "zod";
import { attachSessionCookie, ensureAuthSecretConfigured, hashPassword } from "@/src/lib/auth";
import { query } from "@/src/lib/db";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/src/lib/security";
import type { User } from "@/src/types/hirematch";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.email().trim().max(254),
  password: z.string().min(10).max(200),
  role: z.enum(["candidate", "hrd"]),
  company_name: z.string().trim().max(200).optional(),
  legal_number: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(32).optional(),
  portfolio_url: z.string().trim().max(2048).optional(),
});
const publicEmailDomains = new Set(["gmail.com", "yahoo.com", "yahoo.co.id", "hotmail.com", "outlook.com", "icloud.com"]);

export async function POST(request: Request) {
  const limit = checkRateLimit(`register:${clientKey(request)}`, 5, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan daftar. Coba lagi nanti." }, { status: 429, headers: rateLimitHeaders(limit) });
  try {
    ensureAuthSecretConfigured();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AUTH_SECRET belum dikonfigurasi." }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data pendaftaran tidak valid. Password minimal 10 karakter." }, { status: 400 });
  }

  const data = parsed.data;
  if (data.role === "hrd" && (!data.company_name || !data.legal_number)) {
    return NextResponse.json({ error: "Nama perusahaan dan nomor legalitas wajib diisi." }, { status: 400 });
  }
  if (data.role === "hrd" && publicEmailDomains.has(data.email.split("@")[1]?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Akun HRD harus menggunakan email perusahaan." }, { status: 400 });
  }

  try {
    const result = await query<User & { password_hash?: string }>(
      `INSERT INTO users (name, email, password_hash, role, company_name, legal_number, phone, portfolio_url)
       VALUES ($1, LOWER($2), $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, role, company_name, industry, legal_number, phone, portfolio_url, is_verified`,
      [data.name, data.email, hashPassword(data.password), data.role, data.company_name ?? null, data.legal_number ?? null, data.phone ?? null, data.portfolio_url ?? null],
    );
    const user = result.rows[0];
    return attachSessionCookie(
      NextResponse.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } }),
      user,
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Email sudah terdaftar." }, { status: 409 });
    }
    if (error instanceof Error && error.message.includes("AUTH_SECRET")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Pendaftaran gagal. Periksa koneksi database." }, { status: 500 });
  }
}
