import { z } from "zod";
import { prisma } from "../../../../lib/db";
import { AppError, badRequest } from "../../../../lib/errors";
import { handleError, jsonOk } from "../../../../lib/http";

const verifySchema = z.object({
  token: z
    .string()
    .trim()
    .min(32, "Token verifikasi tidak valid.")
    .max(100, "Token verifikasi tidak valid."),
});

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const parsed = verifySchema.safeParse({ token });
    if (!parsed.success) {
      throw badRequest("Parameter token verifikasi tidak valid.");
    }

    const user = await prisma.user.findFirst({
      where: { verifyToken: parsed.data.token },
      select: { id: true, isVerified: true },
    });

    if (!user) {
      throw new AppError(
        400,
        "INVALID_VERIFICATION_TOKEN",
        "Token verifikasi tidak valid atau sudah dipakai.",
      );
    }

    // Satu update atomik: tandai terverifikasi dan hapus token sekali pakai.
    if (!user.isVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true, verifyToken: null },
      });
    }

    return jsonOk({
      verified: true,
      message: "Email berhasil diverifikasi. Silakan login.",
    });
  } catch (error) {
    return handleError(error);
  }
}
