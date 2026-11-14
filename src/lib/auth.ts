import { compare, hash } from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { env } from "./env";
import { forbidden, unauthorized } from "./errors";
import type { Role, SessionPayload } from "./types";

export const SESSION_COOKIE = "hirematch_session";
const BCRYPT_ROUNDS = 12;
const secret = new TextEncoder().encode(env.AUTH_SECRET);

export async function hashPassword(password: string): Promise<string> {
  return hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function issueSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(payload.userId))
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_TTL_DAYS}d`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ["HS256"],
  });

  const userId = Number(payload.sub);
  const role = payload.role;

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    (role !== "candidate" && role !== "hrd")
  ) {
    throw new Error("Token sesi tidak valid.");
  }

  return { userId, role };
}

// Cookie sesi: httpOnly, sameSite=lax, secure hanya di production.
export async function setSession(payload: SessionPayload): Promise<void> {
  const token = await issueSessionToken(payload);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: env.SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    return await verifySessionToken(token);
  } catch {
    // Token rusak/kedaluwarsa diperlakukan sebagai belum login.
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw unauthorized();
  }
  return session;
}

export async function requireRole(...roles: Role[]): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    throw forbidden("Role akun Anda tidak diizinkan untuk aksi ini.");
  }
  return session;
}
