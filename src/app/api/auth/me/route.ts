import { requireSession } from "../../../../lib/auth";
import { toPublicUser } from "../../../../lib/auth-service";
import { prisma } from "../../../../lib/db";
import { unauthorized } from "../../../../lib/errors";
import { handleError, jsonOk } from "../../../../lib/http";

export async function GET() {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    // Akun sudah dihapus tetapi JWT masih valid -> anggap sesi tidak valid.
    if (!user) {
      throw unauthorized("Sesi tidak valid. Silakan login kembali.");
    }

    return jsonOk({ user: toPublicUser(user) });
  } catch (error) {
    return handleError(error);
  }
}
