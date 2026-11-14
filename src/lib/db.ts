import { PrismaClient } from "@prisma/client";

// Simpan instance Prisma di globalThis saat development agar hot reload
// tidak membuat koneksi baru terus-menerus (menghindari connection pool habis).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
