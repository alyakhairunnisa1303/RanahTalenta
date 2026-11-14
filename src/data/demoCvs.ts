import { getCandidateCv } from "../lib/local-store";

// CV contoh untuk mode demo. Pada alur nyata, teks CV berasal dari unggahan
// pelamar yang sudah diekstrak dan disamarkan oleh /api/screen.
export const DEMO_CANDIDATE_CV = [
  "Curriculum Vitae",
  "Nama: Pelamar Demo",
  "Email: pelamar@example.com",
  "No HP: 081100000001",
  "Pendidikan: S1 Teknik Informatika",
  "",
  "Pengalaman:",
  "- Frontend Developer, 2 tahun membangun dashboard dengan React, Next.js, dan Tailwind CSS.",
  "- Mengonsumsi REST API, mengelola state aplikasi, dan optimasi performa halaman.",
  "- Berkolaborasi dengan desainer dan backend dalam siklus sprint.",
  "",
  "Skill: React, Next.js, TypeScript, Tailwind CSS, REST API, Git.",
  "Portofolio: github.com/pelamardemo",
].join("\n");

const CANDIDATE_CVS: Record<number, string> = {
  21: [
    "Curriculum Vitae",
    "Nama: Rina Maharani",
    "Email: rina.maharani@example.com",
    "No HP: 081234567890",
    "Pendidikan: S1 Sistem Informasi",
    "",
    "Pengalaman:",
    "- Backend Developer, 3 tahun membangun REST API dengan PHP Laravel.",
    "- Mengoptimalkan query MySQL, merancang autentikasi, dan memakai Git flow.",
    "- Mengelola deployment aplikasi tanpa Docker dan menyusun pipeline sederhana.",
    "",
    "Skill: PHP, Laravel, MySQL, REST API, Git, Docker dasar.",
  ].join("\n"),
  22: [
    "Curriculum Vitae",
    "Nama: Bagas Pratama",
    "Email: bagas.pratama@example.com",
    "No HP: 081322221111",
    "Pendidikan: S1 Teknik Komputer",
    "",
    "Pengalaman:",
    "- Backend Engineer, 4 tahun mengembangkan API Laravel dan autentikasi JWT/Sanctum.",
    "- Memimpin modul pembayaran dan integrasi payment gateway.",
    "- Menulis dokumentasi API dan berkolaborasi dengan tim frontend.",
    "",
    "Skill: PHP, Laravel, JWT, REST API, MySQL, Git.",
  ].join("\n"),
  23: [
    "Curriculum Vitae",
    "Nama: Siti Aulia",
    "Email: siti.aulia@example.com",
    "No HP: 085798765432",
    "Pendidikan: D3 Manajemen Informatika",
    "",
    "Pengalaman:",
    "- Magang 8 bulan sebagai web developer menggunakan PHP dan MySQL.",
    "- Membuat CRUD, form validasi, dan laporan sederhana.",
    "- Mempelajari dasar Laravel dan Git selama proyek akhir.",
    "",
    "Skill: PHP dasar, MySQL, HTML, CSS, Git.",
  ].join("\n"),
  24: [
    "Curriculum Vitae",
    "Nama: Dimas Anggara",
    "Email: dimas.anggara@example.com",
    "No HP: 082155550000",
    "Pendidikan: S1 Ilmu Komputer",
    "",
    "Pengalaman:",
    "- Proyek pribadi backend dengan Node.js dan Express.",
    "- Membangun REST API sederhana serta integrasi database.",
    "- Aktif belajar PHP, Laravel, dan pengembangan tim.",
    "",
    "Skill: JavaScript, Node.js, Express, MySQL dasar, Git.",
  ].join("\n"),
};

export function getCvForCandidate(candidateId: number): string {
  if (candidateId === 1) {
    return getCandidateCv() ?? DEMO_CANDIDATE_CV;
  }
  return CANDIDATE_CVS[candidateId] ?? DEMO_CANDIDATE_CV;
}
