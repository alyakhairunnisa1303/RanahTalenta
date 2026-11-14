import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { User, UserRole } from "../types/hirematch";

const COOKIE_NAME = "hirematch_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = Pick<User, "id" | "name" | "email" | "role" | "company_name" | "industry" | "legal_number" | "phone" | "portfolio_url" | "is_verified">;

interface SessionPayload {
  sub: number;
  role: UserRole;
  exp: number;
}

function sessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("AUTH_SECRET wajib diisi dengan minimal 32 karakter acak.");
  }
  return secret;
}

export function ensureAuthSecretConfigured(): void {
  sessionSecret();
}

function sign(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(user: Pick<User, "id" | "role">): string {
  const payload: SessionPayload = {
    sub: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function readSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  try {
    const actual = Buffer.from(signature, "base64url");
    const expected = Buffer.from(sign(encoded), "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    if (!Number.isSafeInteger(payload.sub) || payload.sub < 1 || payload.exp <= Date.now() / 1000) return null;
    if (payload.role !== "candidate" && payload.role !== "hrd") return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return token ? readSessionToken(token) : null;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  if (!session) return null;
  const { query } = await import("./db");
  const result = await query<SessionUser>(
    `SELECT id, name, email, role, company_name, industry, legal_number, phone, portfolio_url, is_verified
     FROM users WHERE id = $1`,
    [session.sub],
  );
  const user = result.rows[0];
  return user && user.role === session.role ? user : null;
}

export function attachSessionCookie(response: Response, user: Pick<User, "id" | "role">): Response {
  const token = createSessionToken(user);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure}`,
  );
  return response;
}

export function clearSessionCookie(response: Response): Response {
  response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
