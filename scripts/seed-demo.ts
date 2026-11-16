import { randomBytes, scryptSync } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur. Isi .env.local terlebih dahulu.");
}

const DEMO_PASSWORD = "DemoHRD2026!";
const companies = [
  {
    name: "Nusantara Digital",
    industry: "Teknologi informasi dan layanan digital",
    contact: "Rina Pratama",
    email: "hrd@nusantaradigital.example.test",
    legal: "DEMO-ND-001",
    phone: "+62 21 5550 1001",
    jobs: [
      ["Frontend Developer", "Mengembangkan antarmuka web yang responsif dan mudah digunakan menggunakan React dan TypeScript.", "React\nTypeScript\nHTML dan CSS\nREST API\nGit", "Jakarta / Hybrid", "Rp 8.000.000–12.000.000"],
      ["Backend Developer", "Merancang API dan layanan backend yang aman, terukur, serta terintegrasi dengan basis data relasional.", "Node.js\nTypeScript\nPostgreSQL\nREST API\nDocker", "Jakarta / Hybrid", "Rp 9.000.000–14.000.000"],
      ["UI/UX Designer", "Menyusun alur produk dan desain antarmuka berdasarkan riset pengguna serta berkolaborasi dengan tim engineering.", "Figma\nUser research\nWireframing\nPrototyping\nDesign system", "Bandung / Hybrid", "Rp 7.000.000–11.000.000"],
      ["QA Engineer", "Menguji kualitas aplikasi web dan menulis skenario pengujian manual maupun otomatis.", "Software testing\nPlaywright atau Cypress\nAPI testing\nBug reporting\nKomunikasi", "Jakarta", "Rp 7.000.000–10.000.000"],
    ],
  },
  {
    name: "Bumi Sehat Teknologi",
    industry: "Teknologi kesehatan",
    contact: "Dimas Saputra",
    email: "talent@bumisehat.example.test",
    legal: "DEMO-BST-002",
    phone: "+62 22 5550 2002",
    jobs: [
      ["Data Analyst", "Mengolah data operasional menjadi laporan dan insight yang membantu pengambilan keputusan bisnis.", "SQL\nPython\nExcel\nData visualization\nStatistik dasar", "Bandung / Hybrid", "Rp 7.000.000–11.000.000"],
      ["Product Manager", "Menentukan prioritas produk, menyelaraskan kebutuhan pengguna dan bisnis, serta mengawal peluncuran fitur.", "Product discovery\nRoadmapping\nAnalisis metrik\nAgile\nKomunikasi lintas tim", "Yogyakarta / Remote", "Rp 12.000.000–18.000.000"],
      ["Digital Marketing Specialist", "Merencanakan kampanye digital dan mengukur performa kanal untuk meningkatkan akuisisi pengguna.", "SEO dan SEM\nGoogle Analytics\nContent strategy\nMeta Ads\nPelaporan", "Yogyakarta", "Rp 6.000.000–9.000.000"],
    ],
  },
  {
    name: "Kreasi Finansial Indonesia",
    industry: "Teknologi finansial",
    contact: "Alya Maharani",
    email: "karier@kreasifinansial.example.test",
    legal: "DEMO-KFI-003",
    phone: "+62 21 5550 3003",
    jobs: [
      ["Mobile App Developer", "Membangun dan memelihara aplikasi mobile untuk layanan finansial dengan perhatian pada keamanan dan pengalaman pengguna.", "Flutter atau React Native\nDart atau TypeScript\nREST API\nGit\nMobile testing", "Jakarta / Hybrid", "Rp 10.000.000–16.000.000"],
      ["Business Analyst", "Mengumpulkan kebutuhan pemangku kepentingan dan menerjemahkannya menjadi spesifikasi proses serta produk.", "Requirement gathering\nProcess mapping\nSQL dasar\nDokumentasi\nStakeholder management", "Surabaya / Hybrid", "Rp 8.000.000–12.000.000"],
      ["Customer Success Associate", "Mendampingi pelanggan menggunakan produk, menindaklanjuti kendala, dan menyampaikan masukan ke tim produk.", "Komunikasi tertulis\nCustomer support\nProblem solving\nCRM\nMicrosoft Office", "Surabaya", "Rp 5.000.000–7.500.000"],
    ],
  },
];

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  let accountCount = 0;
  let jobCount = 0;

  try {
    await client.query("BEGIN");

    for (const company of companies) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, company_name, industry, legal_number, phone)
         VALUES ($1, $2, $3, 'hrd', $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE SET industry = COALESCE(users.industry, EXCLUDED.industry)`,
        [company.contact, company.email, hashPassword(DEMO_PASSWORD), company.name, company.industry, company.legal, company.phone],
      );

      const userResult = await client.query<{ id: string; role: string }>(
        "SELECT id, role FROM users WHERE email = $1",
        [company.email],
      );
      const user = userResult.rows[0];
      if (!user || user.role !== "hrd") {
        throw new Error(`Akun demo ${company.email} sudah ada tetapi bukan akun HRD.`);
      }
      accountCount += 1;

      for (const [title, description, requirements, location, salary] of company.jobs) {
        const result = await client.query(
          `INSERT INTO jobs (hrd_id, title, description, requirements, location, salary_range)
           SELECT $1, $2, $3, $4, $5, $6
           WHERE NOT EXISTS (SELECT 1 FROM jobs WHERE hrd_id = $1 AND title = $2)`,
          [user.id, title, description, requirements, location, salary],
        );
        jobCount += result.rowCount ?? 0;
      }
    }

    await client.query("COMMIT");
    process.stdout.write(
      `Seed demo selesai: ${accountCount} akun HRD tersedia, ${jobCount} lowongan baru ditambahkan (total target 10).\n` +
      `Login semua akun: password ${DEMO_PASSWORD}\n` +
      companies.map((company) => `- ${company.email} — ${company.name}`).join("\n") +
      "\n",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

void main();
