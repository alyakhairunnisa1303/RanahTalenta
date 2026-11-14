import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId: rawId } = await params;
  const applicationId = Number(rawId);
  if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
    return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  try {
    const result = await query<{ file_path: string | null; file_name: string | null; file_type: string | null }>(
      `SELECT d.file_path, d.file_name, d.file_type
       FROM application_documents d JOIN applications a ON a.id = d.application_id
       JOIN jobs j ON j.id = a.job_id
       WHERE a.id = $1 AND (a.candidate_id = $2 OR (j.hrd_id = $2 AND $3 = 'hrd' AND a.status = 'shortlisted'))`,
      [applicationId, user.id, user.role],
    );
    const record = result.rows[0];
    if (!record?.file_path || !record.file_name || !record.file_type) {
      return NextResponse.json({ error: "Berkas lampiran tidak ditemukan." }, { status: 404 });
    }

    const bytes = await readFile(record.file_path);
    return new Response(bytes, {
      headers: {
        "Content-Type": record.file_type,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${basename(record.file_name).replace(/["\\\r\n]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(record.file_name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Berkas lampiran tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ error: "Berkas gagal dibaca." }, { status: 500 });
  }
}
