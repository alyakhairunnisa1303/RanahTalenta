import { randomBytes, scryptSync } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { Pool } from "pg";

loadEnvConfig(process.cwd());

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL belum diatur. Isi .env.local terlebih dahulu.");
}

const DEMO_PASSWORD = "DemoPelamar2026!";
const APPLICATIONS_PER_CANDIDATE = 5;

const roleProfiles = [
  {
    role: "Frontend Developer",
    skills: ["React", "TypeScript", "Next.js", "HTML dan CSS", "Tailwind CSS", "REST API", "Git", "aksesibilitas"],
    project: "membangun dashboard analitik responsif yang menurunkan waktu muat halaman sebesar 35%",
  },
  {
    role: "Backend Developer",
    skills: ["Node.js", "TypeScript", "PostgreSQL", "REST API", "Docker", "Git", "autentikasi", "optimasi query"],
    project: "merancang layanan REST yang menangani ribuan permintaan harian dengan pencatatan dan validasi yang konsisten",
  },
  {
    role: "UI/UX Designer",
    skills: ["Figma", "user research", "wireframing", "prototyping", "design system", "usability testing", "aksesibilitas"],
    project: "menyederhanakan proses onboarding setelah wawancara pengguna dan pengujian prototipe",
  },
  {
    role: "QA Engineer",
    skills: ["software testing", "Playwright", "Cypress", "API testing", "Postman", "bug reporting", "test case"],
    project: "mengotomasi regresi alur utama dan mempercepat verifikasi rilis mingguan",
  },
  {
    role: "Data Analyst",
    skills: ["SQL", "Python", "Excel", "Power BI", "data visualization", "statistik dasar", "pandas"],
    project: "membuat dashboard operasional yang membantu tim menemukan tren dan anomali lebih cepat",
  },
  {
    role: "Product Manager",
    skills: ["product discovery", "roadmapping", "analisis metrik", "Agile", "komunikasi lintas tim", "user research"],
    project: "menyusun prioritas roadmap berbasis wawancara pengguna, metrik produk, dan kebutuhan bisnis",
  },
  {
    role: "Digital Marketing Specialist",
    skills: ["SEO", "SEM", "Google Analytics", "content strategy", "Meta Ads", "pelaporan", "A/B testing"],
    project: "mengoptimalkan kampanye lintas kanal dan meningkatkan jumlah prospek berkualitas",
  },
  {
    role: "Mobile App Developer",
    skills: ["Flutter", "React Native", "Dart", "TypeScript", "REST API", "Git", "mobile testing"],
    project: "mengembangkan fitur aplikasi mobile dengan sinkronisasi API dan penanganan kondisi jaringan lemah",
  },
  {
    role: "Business Analyst",
    skills: ["requirement gathering", "process mapping", "SQL", "dokumentasi", "stakeholder management", "BPMN"],
    project: "memetakan proses lintas tim dan menyusun requirement yang dapat diuji sebelum implementasi",
  },
  {
    role: "Customer Success Associate",
    skills: ["komunikasi tertulis", "customer support", "problem solving", "CRM", "Microsoft Office", "pelaporan"],
    project: "membuat panduan bantuan dan alur tindak lanjut yang meningkatkan penyelesaian tiket pelanggan",
  },
] as const;

const requiredSkills: Record<string, string[]> = {
  frontend: ["React", "TypeScript", "HTML dan CSS", "REST API", "Git", "aksesibilitas"],
  backend: ["Node.js", "TypeScript", "PostgreSQL", "REST API", "Docker", "Git"],
  design: ["Figma", "user research", "wireframing", "prototyping", "design system", "usability testing"],
  qa: ["software testing", "Playwright", "Cypress", "API testing", "bug reporting", "test case"],
  data: ["SQL", "Python", "Excel", "Power BI", "data visualization", "statistik dasar"],
  product: ["product discovery", "roadmapping", "analisis metrik", "Agile", "komunikasi lintas tim", "user research"],
  marketing: ["SEO", "SEM", "Google Analytics", "content strategy", "Meta Ads", "A/B testing"],
  mobile: ["Flutter", "React Native", "Dart", "TypeScript", "REST API", "mobile testing"],
  business: ["requirement gathering", "process mapping", "SQL", "dokumentasi", "stakeholder management", "BPMN"],
  success: ["komunikasi tertulis", "customer support", "problem solving", "CRM", "Microsoft Office", "pelaporan"],
};

const firstNames = [
  "Alya", "Bagas", "Citra", "Daffa", "Eka", "Farah", "Galih", "Hana", "Irfan", "Jihan",
  "Kevin", "Laras", "Miko", "Nadia", "Oki", "Putri", "Rafi", "Salsa", "Tegar", "Vina",
  "Wahyu", "Yasmin", "Zaki", "Arum", "Bima", "Clara", "Dimas", "Intan", "Rizky", "Tiara",
];
const lastNames = [
  "Pratama", "Lestari", "Wijaya", "Saputra", "Mahendra", "Permata", "Nugraha", "Puspita", "Hidayat", "Anindya",
  "Kusuma", "Ramadhan", "Utami", "Firmansyah", "Wulandari", "Santoso", "Maharani", "Setiawan", "Kurniawan", "Amalia",
  "Putra", "Anggraini", "Siregar", "Dewi", "Fauzi", "Safitri", "Hakim", "Nirmala", "Maulana", "Kartika",
];
const universities = [
  "Universitas Indonesia", "Institut Teknologi Bandung", "Universitas Gadjah Mada", "Universitas Airlangga", "Universitas Diponegoro",
  "Universitas Brawijaya", "Universitas Negeri Yogyakarta", "Universitas Hasanuddin", "Universitas Telkom", "Universitas Padjadjaran",
];
const locations = ["Jakarta", "Bandung", "Yogyakarta", "Surabaya", "Semarang", "Malang", "Makassar", "Remote"];

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function jobFamily(title: string): string {
  const normalized = title.toLowerCase();
  if (normalized.includes("frontend")) return "frontend";
  if (normalized.includes("backend")) return "backend";
  if (normalized.includes("designer") || normalized.includes("design")) return "design";
  if (normalized.includes("qa")) return "qa";
  if (normalized.includes("data analyst")) return "data";
  if (normalized.includes("product manager")) return "product";
  if (normalized.includes("marketing")) return "marketing";
  if (normalized.includes("mobile")) return "mobile";
  if (normalized.includes("business analyst")) return "business";
  if (normalized.includes("customer success")) return "success";
  return "frontend";
}

function makeCv(candidateIndex: number, profile: (typeof roleProfiles)[number]): string {
  const years = 1 + ((candidateIndex * 7) % 7);
  const university = universities[(candidateIndex * 3) % universities.length];
  const location = locations[(candidateIndex * 5) % locations.length];
  const skills = [...profile.skills, "Git", "komunikasi", "kolaborasi tim"];

  return [
    `CURRICULUM VITAE — Kandidat Demo ${String(candidateIndex + 1).padStart(2, "0")}`,
    `Posisi yang diminati: ${profile.role}`,
    `Lokasi: ${location}`,
    `Ringkasan: Profesional ${profile.role} dengan pengalaman ${years} tahun dalam pengembangan produk digital dan kerja lintas fungsi. Terbiasa menyusun pekerjaan secara terukur, mendokumentasikan keputusan, dan menjaga kualitas hasil.`,
    `Pendidikan: S1 ${profile.role.includes("Designer") ? "Desain Komunikasi Visual" : "Teknologi Informasi"}, ${university}. Lulus ${2018 + (candidateIndex % 8)}.`,
    `Pengalaman: ${years} tahun pada tim produk digital. Berkolaborasi dengan engineer, desainer, dan pemilik proses untuk merilis perbaikan berdasarkan kebutuhan pengguna.`,
    `Keahlian: ${skills.join(", ")}.`,
    `Proyek pilihan: ${profile.project}. Tanggung jawab meliputi analisis kebutuhan, implementasi, evaluasi hasil, dan penyampaian temuan kepada tim.`,
    `Pencapaian: Menyelesaikan beberapa inisiatif perbaikan proses; terbuka terhadap umpan balik dan mampu menjelaskan keputusan teknis maupun produk.`,
  ].join("\n\n");
}

function calculateMatch(
  profile: (typeof roleProfiles)[number],
  family: string,
  candidateIndex: number,
  jobId: number,
) {
  const required = requiredSkills[family] ?? requiredSkills.frontend;
  const profileSkills = new Set(profile.skills.map((skill) => skill.toLowerCase()));
  const matched = required.filter((skill) => profileSkills.has(skill.toLowerCase()));
  const missing = required.filter((skill) => !profileSkills.has(skill.toLowerCase()));
  const years = 1 + ((candidateIndex * 7) % 7);
  const skillScore = (matched.length / required.length) * 100;
  const experienceScore = Math.min(years / 5, 1) * 100;
  const educationScore = candidateIndex % 4 === 0 ? 100 : candidateIndex % 4 === 1 ? 85 : 70;
  const variation = ((candidateIndex * 11 + jobId * 7) % 13) - 6;
  const score = Math.max(25, Math.min(99, Math.round(skillScore * 0.65 + experienceScore * 0.25 + educationScore * 0.1 + variation)));

  return { score, matched, missing };
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const jobResult = await client.query<{ id: number; title: string; hrd_id: number }>(
      "SELECT id, title, hrd_id FROM jobs WHERE status = 'open' ORDER BY id",
    );
    const jobs = jobResult.rows;
    if (jobs.length === 0) throw new Error("Belum ada lowongan aktif. Jalankan npm run db:seed terlebih dahulu.");

    const candidates = firstNames.map((firstName, index) => {
      const profile = roleProfiles[Math.floor(index / 3)];
      const candidateIndex = index + 1;
      return {
        index: candidateIndex,
        profile,
        name: `${firstName} ${lastNames[index]}`,
        email: `pelamar.demo.${String(candidateIndex).padStart(2, "0")}@example.test`,
        phone: `+62 800-555-${String(candidateIndex).padStart(4, "0")}`,
        portfolio: `https://portfolio.example.test/pelamar-${String(candidateIndex).padStart(2, "0")}`,
        cv: makeCv(candidateIndex, profile),
      };
    });

    let applicationCount = 0;
    for (const candidate of candidates) {
      const userResult = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, password_hash, role, phone, portfolio_url, is_verified)
         VALUES ($1, $2, $3, 'candidate', $4, $5, TRUE)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash,
           phone = EXCLUDED.phone, portfolio_url = EXCLUDED.portfolio_url, is_verified = TRUE
         RETURNING id`,
        [candidate.name, candidate.email, hashPassword(DEMO_PASSWORD), candidate.phone, candidate.portfolio],
      );
      const candidateId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO candidate_profiles (candidate_id, cv_text)
         VALUES ($1, $2)
         ON CONFLICT (candidate_id) DO UPDATE SET cv_text = EXCLUDED.cv_text, updated_at = NOW()`,
        [candidateId, candidate.cv],
      );

      const rankedJobs = jobs
        .map((job) => ({
          job,
          family: jobFamily(job.title),
          match: calculateMatch(candidate.profile, jobFamily(job.title), candidate.index, job.id),
        }))
        .sort((a, b) => b.match.score - a.match.score || a.job.id - b.job.id)
        .slice(0, Math.min(APPLICATIONS_PER_CANDIDATE, jobs.length));

      for (let rank = 0; rank < rankedJobs.length; rank += 1) {
        const { job, family, match } = rankedJobs[rank];
        const strengths = match.matched.length
          ? match.matched.slice(0, 5).map((skill) => `Memiliki pengalaman dengan ${skill}.`)
          : ["Memiliki pengalaman kerja lintas fungsi dan mampu berkolaborasi dengan tim."];
        const gaps = match.missing.slice(0, 5).map((skill) => `Belum ada bukti pengalaman yang cukup pada ${skill}.`);
        const questions = [
          `Ceritakan proyek paling relevan Anda untuk posisi ${job.title}.`,
          `Bagaimana Anda menggunakan ${match.matched[0] ?? "keahlian utama Anda"} untuk menyelesaikan masalah nyata?`,
          `Apa langkah Anda untuk memperdalam ${match.missing[0] ?? "area yang masih ingin dikembangkan"}?`,
        ];
        const feedback = match.score >= 80
          ? `Kecocokan tinggi. CV menunjukkan bukti kuat untuk ${match.matched.slice(0, 3).join(", ") || "pengalaman relevan"}. Verifikasi kedalaman pengalaman melalui wawancara.`
          : match.score >= 60
            ? `Kecocokan potensial. Kandidat memiliki dasar pada ${match.matched.slice(0, 2).join(" dan ") || "pengalaman terkait"}; gali lebih lanjut ${match.missing[0] ?? "pengalaman praktis"}.`
            : `Kecocokan masih terbatas untuk posisi ini. Pertimbangkan pengalaman kandidat pada ${candidate.profile.role} dan klarifikasi kemampuan yang belum terlihat di CV.`;

        const matchResult = await client.query<{ id: number }>(
          `INSERT INTO job_matches (candidate_id, job_id, match_score, candidate_feedback, hr_strengths, hr_gaps, interview_questions)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)
           ON CONFLICT (candidate_id, job_id) DO UPDATE SET match_score = EXCLUDED.match_score,
             candidate_feedback = EXCLUDED.candidate_feedback, hr_strengths = EXCLUDED.hr_strengths,
             hr_gaps = EXCLUDED.hr_gaps, interview_questions = EXCLUDED.interview_questions, created_at = NOW()
           RETURNING id`,
          [candidateId, job.id, match.score, feedback, JSON.stringify(strengths), JSON.stringify(gaps), JSON.stringify(questions)],
        );
        const status = (candidate.index + job.id) % 19 === 0
          ? "shortlisted"
          : (candidate.index + job.id) % 17 === 0
            ? "rejected"
            : "pending";
        const applicationResult = await client.query<{ id: number }>(
          `INSERT INTO applications (job_match_id, candidate_id, job_id, status, applied_at)
           VALUES ($1, $2, $3, $4, CURRENT_DATE - $5::int)
           ON CONFLICT (candidate_id, job_id) DO NOTHING
           RETURNING id`,
          [matchResult.rows[0].id, candidateId, job.id, status, (candidate.index * 7 + rank * 3) % 30],
        );
        const applicationId = applicationResult.rows[0]?.id ?? (
          await client.query<{ id: number }>(
            "SELECT id FROM applications WHERE candidate_id = $1 AND job_id = $2",
            [candidateId, job.id],
          )
        ).rows[0].id;

        await client.query(
          `INSERT INTO application_documents (application_id, applicant_name, applicant_email, applicant_phone, portfolio_url, cover_letter)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (application_id) DO UPDATE SET applicant_name = EXCLUDED.applicant_name,
             applicant_email = EXCLUDED.applicant_email, applicant_phone = EXCLUDED.applicant_phone,
             portfolio_url = EXCLUDED.portfolio_url, cover_letter = EXCLUDED.cover_letter,
             updated_at = NOW()`,
          [
            applicationId,
            candidate.name,
            candidate.email,
            candidate.phone,
            candidate.portfolio,
            `Yth. tim rekrutmen, saya ${candidate.name} tertarik melamar posisi ${job.title}. Pengalaman saya sebagai ${candidate.profile.role} relevan dengan kebutuhan tim. Saya siap menjelaskan proyek dan hasil kerja saya lebih lanjut.`,
          ],
        );
        applicationCount += applicationResult.rowCount ?? 0;
      }
    }

    await client.query("COMMIT");
    const total = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM applications");
    process.stdout.write(
      `Seed pelamar demo selesai: ${candidates.length} akun pelamar, ${applicationCount} lamaran baru; total lamaran di database ${total.rows[0].count}.\n` +
      `Password semua akun pelamar: ${DEMO_PASSWORD}\n` +
      "Email: pelamar.demo.01@example.test sampai pelamar.demo.30@example.test\n",
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
