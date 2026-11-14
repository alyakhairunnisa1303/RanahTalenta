import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const CV_DIR = path.resolve(process.cwd(), "storage", "cvs");

export async function saveCvFile(buffer: Buffer): Promise<string> {
  await mkdir(CV_DIR, { recursive: true });

  const fileName = `${randomUUID()}.pdf`;
  await writeFile(path.join(CV_DIR, fileName), buffer);

  return path.posix.join("storage", "cvs", fileName);
}

export async function deleteCvFile(
  relativePath: string | null | undefined,
): Promise<void> {
  if (!relativePath) {
    return;
  }

  const fileName = path.basename(relativePath);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(
      fileName,
    )
  ) {
    console.error("[STORAGE] Path CV tidak aman, penghapusan dilewati.");
    return;
  }

  const resolved = path.join(CV_DIR, fileName);

  try {
    await unlink(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
