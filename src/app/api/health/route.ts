import { connection } from "next/server";
import { prisma } from "../../../lib/db";

// Health check: memastikan proses Next.js hidup dan database bisa dihubungi.
// connection() memaksa handler berjalan saat request (bukan saat prerender build).
export async function GET() {
  await connection();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json(
      {
        ok: true,
        data: {
          status: "ok",
          database: "up",
          timestamp: new Date().toISOString(),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    // Jangan bocorkan detail koneksi/error database ke klien.
    return Response.json(
      {
        ok: false,
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Database tidak dapat dihubungi.",
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
