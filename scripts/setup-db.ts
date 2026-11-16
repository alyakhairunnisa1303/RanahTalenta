import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur. Isi .env.local terlebih dahulu.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  try {
    const schema = await readFile(path.join(process.cwd(), "db", "schema.sql"), "utf8");
    await pool.query(schema);
    process.stdout.write("Skema HireMatch berhasil dibuat/diperbarui.\n");
  } finally {
    await pool.end();
  }
}

void main();
