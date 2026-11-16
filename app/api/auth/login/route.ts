import { NextResponse } from "next/server";
import { z } from "zod";
import { attachSessionCookie, ensureAuthSecretConfigured, verifyPassword } from "@/src/lib/auth";
import { query } from "@/src/lib/db";
import { checkRateLimit, clientKey, rateLimitHeaders } from "@/src/lib/security";
import type { User } from "@/src/types/hirematch";

const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(200),
  role: z.enum(["candidate", "hrd"]),
});

export async function POST(request: Request) {
  const limit = checkRateLimit(`login:${clientKey(request)}`, 10);
  if (!limit.allowed) return NextResponse.json({ error: "Terlalu banyak percobaan login. Coba lagi nanti." }, { status: 429, headers: rateLimitHeaders(limit) });
  try {
    ensureAuthSecretConfigured();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AUTH_SECRET belum dikonfigurasi." }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email, password, atau role tidak valid." }, { status: 400 });
  }

  try {
    const result = await query<User & { password_hash: string }>(
      `SELECT id, name, email, role, company_name, industry, legal_number, phone, portfolio_url, is_verified, password_hash
       FROM users WHERE email = LOWER($1)`,
      [parsed.data.email],
    );
    const user = result.rows[0];
    if (!user || user.role !== parsed.data.role || !verifyPassword(parsed.data.password, user.password_hash)) {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_name: user.company_name,
      industry: user.industry,
      legal_number: user.legal_number,
      phone: user.phone,
      portfolio_url: user.portfolio_url,
      is_verified: user.is_verified,
    };
    return attachSessionCookie(
      NextResponse.json({ user: safeUser }, { headers: { "Cache-Control": "no-store" } }),
      user,
    );
  } catch (error) {
    if (error instanceof Error && (error.message.includes("AUTH_SECRET") || error.message.includes("DATABASE_URL"))) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json({ error: "Login gagal. Periksa koneksi database." }, { status: 500 });
  }
}
