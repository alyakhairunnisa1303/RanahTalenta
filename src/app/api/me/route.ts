import { clearSession, requireSession } from "../../../lib/auth";
import { prisma } from "../../../lib/db";
import { handleError, jsonOk } from "../../../lib/http";
import { deleteCvFile } from "../../../lib/storage";

export async function DELETE() {
  try {
    const session = await requireSession();

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        cvPath: true,
      },
    });

    if (user) {
      await deleteCvFile(user.cvPath);
      await prisma.user.deleteMany({ where: { id: session.userId } });
    }

    await clearSession();

    return jsonOk({
      message:
        "Akun dan seluruh data terkait telah dihapus. File CV juga dihapus dari penyimpanan.",
    });
  } catch (error) {
    return handleError(error);
  }
}
