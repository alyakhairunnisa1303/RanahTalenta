import { randomBytes } from "node:crypto";
import { Prisma, type User } from "@prisma/client";
import { hashPassword } from "./auth";
import { prisma } from "./db";
import { ensureCompanyEmail } from "./email-domain";
import { badRequest, conflict } from "./errors";
import { sendVerificationEmail } from "./mailer";
import type { Role } from "./types";

export type RegisterInput = {
  role: Role;
  name: string;
  email: string;
  password: string;
  phone?: string;
  portfolioUrl?: string;
  companyName?: string;
  legalNumber?: string;
};

// Hanya field aman yang boleh keluar ke klien.
// password, verify_token, cv_path, dan cv_text tidak pernah disertakan.
export function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company_name: user.companyName,
    legal_number: user.legalNumber,
    phone: user.phone,
    portfolio_url: user.portfolioUrl,
    is_verified: user.isVerified,
    has_cv: Boolean(user.cvPath),
    created_at: user.createdAt.toISOString(),
  };
}

export async function registerUser(input: RegisterInput) {
  if (input.role === "hrd") {
    ensureCompanyEmail(input.email);
    if (!input.companyName || !input.legalNumber) {
      throw badRequest("Company name dan legal number wajib diisi untuk HRD.");
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    throw conflict("Email sudah terdaftar.");
  }

  const passwordHash = await hashPassword(input.password);
  const verifyToken = randomBytes(32).toString("hex");

  let user: User;
  try {
    user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: passwordHash,
        role: input.role,
        companyName: input.role === "hrd" ? input.companyName : null,
        legalNumber: input.role === "hrd" ? input.legalNumber : null,
        phone: input.phone ?? null,
        portfolioUrl: input.portfolioUrl ?? null,
        isVerified: false,
        verifyToken,
      },
    });
  } catch (error) {
    // Tangani race condition dua registrasi dengan email sama.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw conflict("Email sudah terdaftar.");
    }
    throw error;
  }

  // Email gagal terkirim tidak boleh membatalkan pendaftaran; token tetap
  // tersimpan dan bisa diverifikasi ulang lewat console (development).
  let emailSent = false;
  try {
    const mail = await sendVerificationEmail(user.email, user.name, verifyToken);
    emailSent = mail.delivered;
  } catch (error) {
    console.error(
      "[REGISTER] Gagal mengirim email verifikasi:",
      error instanceof Error ? error.message : error,
    );
  }

  return { user: toPublicUser(user), emailSent };
}
