import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

const CANDIDATE_PASSWORD = "Kandidat123!";
const HRD_PASSWORD = "Hrd123!";

async function main() {
  const [candidatePassword, hrdPassword] = await Promise.all([
    hash(CANDIDATE_PASSWORD, BCRYPT_ROUNDS),
    hash(HRD_PASSWORD, BCRYPT_ROUNDS),
  ]);

  const hrd = await prisma.user.upsert({
    where: { email: "hrd@hirematch.co.id" },
    update: {
      name: "Rina HRD",
      password: hrdPassword,
      role: "hrd",
      companyName: "PT HireMatch Nusantara",
      legalNumber: "AHU-SEED-001",
      phone: "0215550101",
      portfolioUrl: null,
      isVerified: true,
      verifyToken: null,
    },
    create: {
      name: "Rina HRD",
      email: "hrd@hirematch.co.id",
      password: hrdPassword,
      role: "hrd",
      companyName: "PT HireMatch Nusantara",
      legalNumber: "AHU-SEED-001",
      phone: "0215550101",
      isVerified: true,
    },
  });

  const candidates = await Promise.all([
    prisma.user.upsert({
      where: { email: "budi@example.com" },
      update: {
        name: "Budi Santoso",
        password: candidatePassword,
        role: "candidate",
        phone: "081234567890",
        portfolioUrl: "https://example.com/budi",
        isVerified: true,
        verifyToken: null,
      },
      create: {
        name: "Budi Santoso",
        email: "budi@example.com",
        password: candidatePassword,
        role: "candidate",
        phone: "081234567890",
        portfolioUrl: "https://example.com/budi",
        isVerified: true,
      },
    }),
    prisma.user.upsert({
      where: { email: "siti@example.com" },
      update: {
        name: "Siti Aminah",
        password: candidatePassword,
        role: "candidate",
        phone: "081298765432",
        portfolioUrl: "https://example.com/siti",
        isVerified: true,
        verifyToken: null,
      },
      create: {
        name: "Siti Aminah",
        email: "siti@example.com",
        password: candidatePassword,
        role: "candidate",
        phone: "081298765432",
        portfolioUrl: "https://example.com/siti",
        isVerified: true,
      },
    }),
  ]);

  const seedJobs = [
    {
      title: "Backend Engineer",
      description:
        "Kami mencari Backend Engineer untuk membangun API yang andal, aman, dan mudah dirawat. Anda akan bekerja dekat dengan tim produk dan frontend untuk mengirim fitur secara rutin.",
      requirements:
        "Menguasai TypeScript dan Node.js. Pengalaman PostgreSQL dan REST API. Terbiasa Docker, Git, dan pengujian otomatis. Minimal 3 tahun pengalaman relevan.",
      location: "Jakarta (Hybrid)",
      salaryRange: "Rp10.000.000 - Rp18.000.000",
    },
    {
      title: "Frontend Engineer",
      description:
        "Bergabunglah dengan tim frontend untuk membangun antarmuka yang cepat, aksesibel, dan nyaman digunakan. Anda akan berkolaborasi dengan desainer dan backend engineer.",
      requirements:
        "Menguasai React, TypeScript, dan Next.js. Memahami HTML, CSS, responsive design, dan aksesibilitas. Pengalaman dengan Tailwind CSS dan pengujian komponen menjadi nilai tambah.",
      location: "Bandung (Remote)",
      salaryRange: "Rp8.000.000 - Rp15.000.000",
    },
    {
      title: "Data Analyst",
      description:
        "Kami membutuhkan Data Analyst untuk mengubah data menjadi insight yang dapat ditindaklanjuti. Anda akan membangun dashboard, membersihkan data, dan mendukung keputusan bisnis.",
      requirements:
        "Menguasai SQL dan Python. Pengalaman dengan Excel, Tableau atau Power BI. Memahami statistik dasar dan visualisasi data. Kemampuan komunikasi yang baik.",
      location: "Jakarta (On-site)",
      salaryRange: "Rp9.000.000 - Rp16.000.000",
    },
  ];

  for (const job of seedJobs) {
    const existing = await prisma.job.findFirst({
      where: {
        hrdId: hrd.id,
        title: job.title,
      },
      select: { id: true },
    });

    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: {
          ...job,
          status: "open",
        },
      });
    } else {
      await prisma.job.create({
        data: {
          ...job,
          hrdId: hrd.id,
          status: "open",
        },
      });
    }
  }

  console.log("Seed selesai.");
  console.log(`HRD: hrd@hirematch.co.id / ${HRD_PASSWORD}`);
  console.log(
    `Kandidat: ${candidates.map((candidate) => candidate.email).join(", ")} / ${CANDIDATE_PASSWORD}`,
  );
  console.log(`Lowongan aktif: ${seedJobs.length}`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
