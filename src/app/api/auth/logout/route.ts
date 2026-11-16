import { clearSession } from "../../../../lib/auth";
import { handleError, jsonOk } from "../../../../lib/http";

export async function POST() {
  try {
    await clearSession();
    return jsonOk({ message: "Logout berhasil." });
  } catch (error) {
    return handleError(error);
  }
}
