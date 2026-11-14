import { z } from "zod";
import { prisma } from "../../../../lib/db";
import { setSession, verifyPassword } from "../../../../lib/auth";
import {
  emailNotVerified,
  invalidCredentials,
} from "../../../../lib/errors";
import { handleError, jsonOk, parseJson } from "../../../../lib/http";
import {
  enforceRateLimit,
  requestRateLimitKey,
} from "../../../../lib/rate-limit";
import { toPublicUser } from "../../../../lib/auth-service";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(190, "Email maksimal 190 karakter.")
    .pipe(z.email("Format email tidak valid.")),
  password: z
    .string()
    .min(1, "Password wajib diisi.")
    .max(72, "Password maksimal 72 karakter."),
});

export async function POST(request: Request) {
  try {
    // Batasi brute force per IP dan per email.
    enforceRateLimit(
      requestRateLimitKey(request, "login"),
      10,
      15 * 60 * 1000,
    );

    const input = await parseJson(request, loginSchema);
    enforceRateLimit(`login:email:${input.email}`, 10, 15 * 60 * 1000);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Pesan sama untuk email tidak ditemukan dan password salah agar tidak
    // membocorkan email mana yang terdaftar.
    if (!user) {
      throw invalidCredentials();
    }

    const passwordValid = await verifyPassword(input.password, user.password);
    if (!passwordValid) {
      throw invalidCredentials();
    }

    if (!user.isVerified) {
      throw emailNotVerified();
    }

    await setSession({ userId: user.id, role: user.role });
    return jsonOk({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}
