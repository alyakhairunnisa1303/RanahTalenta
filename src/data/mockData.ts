// Data mock untuk tampilan. Ganti dengan fetch ke API backend nanti.
import type {
  ApplicantRow,
  Application,
  ApplicationStatus,
  Job,
  JobMatch,
  JobStatus,
  User,
} from "../types/hirematch";

// Simulasi user yang sedang login
export const CURRENT_CANDIDATE_ID = 1;
export const CURRENT_HRD_ID = 10;

export const users: User[] = [
  // HRD / perusahaan
  { id: 10, name: "Andi Wijaya", email: "hrd@nusantaratech.co.id", role: "hrd", company_name: "Nusantara Tech", legal_number: "9120012345678", phone: null, portfolio_url: null, is_verified: true },
  { id: 11, name: "Maya Sari", email: "hrd@kopidata.co.id", role: "hrd", company_name: "Kopi Data Indonesia", legal_number: "9120087654321", phone: null, portfolio_url: null, is_verified: true },
  { id: 12, name: "Rudi Hartono", email: "hrd@garudadigital.id", role: "hrd", company_name: "Garuda Digital", legal_number: "9120011122233", phone: null, portfolio_url: null, is_verified: true },
  { id: 13, name: "Lina Putri", email: "hrd@studiopiksel.id", role: "hrd", company_name: "Studio Piksel", legal_number: "9120044455566", phone: null, portfolio_url: null, is_verified: false },
  { id: 14, name: "Tono Prasetyo", email: "hrd@sinarmedia.co.id", role: "hrd", company_name: "Sinar Media", legal_number: "9120099988877", phone: null, portfolio_url: null, is_verified: true },
  // Pelamar
  { id: 1, name: "Anda (Pelamar Demo)", email: "pelamar@example.com", role: "candidate", company_name: null, legal_number: null, phone: "+62 811-0000-0001", portfolio_url: "github.com/pelamardemo", is_verified: true },
  { id: 21, name: "Rina Maharani", email: "rina.maharani@example.com", role: "candidate", company_name: null, legal_number: null, phone: "+62 812-3456-7890", portfolio_url: "github.com/rinamaharani", is_verified: true },
  { id: 22, name: "Bagas Pratama", email: "bagas.pratama@example.com", role: "candidate", company_name: null, legal_number: null, phone: "+62 813-2222-1111", portfolio_url: "linkedin.com/in/bagaspratama", is_verified: true },
  { id: 23, name: "Siti Aulia", email: "siti.aulia@example.com", role: "candidate", company_name: null, legal_number: null, phone: "+62 857-9876-5432", portfolio_url: "portfolio.sitiaulia.dev", is_verified: true },
  { id: 24, name: "Dimas Anggara", email: "dimas.anggara@example.com", role: "candidate", company_name: null, legal_number: null, phone: "+62 821-5555-0000", portfolio_url: "github.com/dimasanggara", is_verified: true },
];

export const jobs: Job[] = [
  {
    id: 1,
    hrd_id: 10,
    title: "Backend Developer (Laravel)",
    description:
      "Kami mencari Backend Developer yang antusias untuk bergabung dengan tim produk. Anda akan merancang API, mengoptimalkan query database, dan berkolaborasi erat dengan tim front end dan data.",
    requirements:
      "Minimal 2 tahun pengalaman dengan PHP/Laravel\nMenguasai MySQL dan desain REST API\nFamiliar dengan Git dan alur kerja tim\nNilai plus: Docker dan CI/CD",
    location: "Jakarta",
    salary_range: "Rp 10–15 jt",
    status: "open",
    created_at: "2026-11-12",
  },
  {
    id: 2,
    hrd_id: 11,
    title: "Data Analyst",
    description:
      "Bergabunglah dengan tim data untuk mengubah data mentah menjadi keputusan bisnis. Anda akan membangun dashboard, menjalankan analisis ad-hoc, dan mempresentasikan temuan ke manajemen.",
    requirements:
      "Mahir SQL dan Excel/Google Sheets\nPengalaman dengan tools BI (Metabase, Power BI, atau Looker)\nKemampuan komunikasi yang baik\nNilai plus: Python (pandas)",
    location: "Bandung",
    salary_range: "Rp 8–12 jt",
    status: "open",
    created_at: "2026-11-11",
  },
  {
    id: 3,
    hrd_id: 12,
    title: "Frontend Developer (Next.js)",
    description:
      "Kami membutuhkan Frontend Developer untuk membangun UI yang responsif dan aksesibel. Anda akan bekerja dengan desainer dan backend developer dalam siklus sprint dua mingguan.",
    requirements:
      "Pengalaman dengan React dan Next.js\nMenguasai Tailwind CSS atau framework CSS modern\nTerbiasa konsumsi REST API\nNilai plus: pengalaman testing (Jest/Playwright)",
    location: "Remote",
    salary_range: "Rp 9–14 jt",
    status: "open",
    created_at: "2026-11-13",
  },
  {
    id: 4,
    hrd_id: 13,
    title: "UI/UX Designer",
    description:
      "Kami mencari UI/UX Designer yang mampu mengubah kebutuhan pengguna menjadi desain yang intuitif dan indah, dari riset hingga prototipe.",
    requirements:
      "Portofolio desain produk digital\nMahir Figma dan prototyping\nMemahami riset pengguna dasar\nNilai plus: pengalaman design system",
    location: "Yogyakarta",
    salary_range: "Rp 7–10 jt",
    status: "open",
    created_at: "2026-11-09",
  },
  {
    id: 5,
    hrd_id: 14,
    title: "Digital Marketing Specialist",
    description:
      "Anda akan merencanakan dan mengeksekusi kampanye pemasaran digital untuk beberapa merek klien, serta melaporkan hasilnya secara berkala.",
    requirements:
      "Pengalaman mengelola Meta Ads dan Google Ads\nMemahami dasar SEO dan analytics\nKreatif dan berorientasi hasil",
    location: "Surabaya",
    salary_range: "Rp 6–9 jt",
    status: "open",
    created_at: "2026-11-07",
  },
  {
    id: 6,
    hrd_id: 10,
    title: "Machine Learning Engineer",
    description:
      "Bergabung dengan tim AI untuk membangun model yang memahami teks berbahasa Indonesia dan menyajikannya lewat layanan produksi.",
    requirements:
      "Pengalaman Python, PyTorch atau TensorFlow\nMemahami NLP dan embedding semantik\nPengalaman deployment model ke produksi\nNilai plus: pengalaman vector database",
    location: "Jakarta",
    salary_range: "Rp 15–22 jt",
    status: "open",
    created_at: "2026-11-10",
  },
  {
    id: 7,
    hrd_id: 10,
    title: "Product Manager",
    description:
      "Memimpin roadmap produk dan berkoordinasi dengan tim engineering dan desain.",
    requirements: "Pengalaman 3 tahun sebagai product manager\nMahir analisis data produk",
    location: "Jakarta",
    salary_range: "Rp 18–25 jt",
    status: "closed",
    created_at: "2026-10-22",
  },
  {
    id: 8,
    hrd_id: 10,
    title: "Admin Data Entry (Gaji Besar)",
    description:
      "Kerja dari rumah, gaji Rp 20 juta per bulan tanpa pengalaman. Pelamar wajib transfer biaya administrasi Rp 500.000 untuk aktivasi akun.",
    requirements: "Punya smartphone\nBersedia transfer biaya administrasi",
    location: "Remote",
    salary_range: "Rp 20 jt",
    status: "flagged",
    created_at: "2026-11-13",
  },
];

export const jobMatches: JobMatch[] = [
  // Hasil AI untuk pelamar demo (candidate_id = 1)
  {
    id: 101, candidate_id: 1, job_id: 3, match_score: 92, created_at: "2026-11-14",
    candidate_feedback: "Skill Next.js dan Tailwind CSS Anda sangat sesuai. Tambahkan contoh proyek dengan testing (Jest/Playwright) untuk memperkuat profil.",
    hr_strengths: ["Next.js", "Tailwind CSS", "REST API"],
    hr_gaps: ["Testing otomatis"],
    interview_questions: [
      "Bagaimana strategi testing yang Anda terapkan pada komponen React?",
      "Ceritakan cara Anda mengoptimalkan performa halaman Next.js.",
      "Bagaimana Anda mengelola state pada aplikasi berukuran menengah?",
    ],
  },
  {
    id: 102, candidate_id: 1, job_id: 1, match_score: 78, created_at: "2026-11-14",
    candidate_feedback: "Pengalaman PHP/Laravel Anda sesuai, namun lowongan ini juga mengharapkan pengalaman Docker dan CI/CD yang belum terlihat di CV.",
    hr_strengths: ["Laravel", "MySQL", "Git"],
    hr_gaps: ["Docker", "CI/CD"],
    interview_questions: [
      "Bagaimana Anda men-deploy aplikasi Laravel ke produksi?",
      "Jelaskan pipeline CI/CD sederhana yang pernah Anda buat.",
      "Bagaimana Anda mengoptimalkan query MySQL yang lambat?",
    ],
  },
  {
    id: 103, candidate_id: 1, job_id: 2, match_score: 65, created_at: "2026-11-14",
    candidate_feedback: "Anda punya dasar SQL yang baik. Cantumkan pengalaman dashboard/BI dan analisis data agar lebih kompetitif.",
    hr_strengths: ["SQL"],
    hr_gaps: ["Tools BI", "Python pandas"],
    interview_questions: [
      "Ceritakan analisis data terakhir yang Anda lakukan.",
      "Tools BI apa yang pernah Anda coba dan bagaimana hasilnya?",
      "Bagaimana Anda memvalidasi kualitas data sebelum dianalisis?",
    ],
  },
  {
    id: 104, candidate_id: 1, job_id: 4, match_score: 71, created_at: "2026-11-14",
    candidate_feedback: "Pemahaman UI Anda cukup baik. Tambahkan studi kasus desain beserta proses riset pengguna di portofolio.",
    hr_strengths: ["Figma", "Prototyping"],
    hr_gaps: ["Riset pengguna", "Design system"],
    interview_questions: [
      "Ceritakan proses desain dari riset hingga prototipe pada satu proyek.",
      "Bagaimana Anda menguji kegunaan desain dengan pengguna?",
      "Apa pendekatan Anda membangun design system?",
    ],
  },
  {
    id: 105, candidate_id: 1, job_id: 6, match_score: 48, created_at: "2026-11-14",
    candidate_feedback: "Posisi ini membutuhkan pengalaman machine learning yang cukup dalam. Pertimbangkan menambahkan proyek NLP jika ada.",
    hr_strengths: ["Python dasar"],
    hr_gaps: ["PyTorch/TensorFlow", "NLP", "Deployment model"],
    interview_questions: [
      "Model ML apa yang pernah Anda latih sendiri?",
      "Jelaskan perbedaan embedding dan one-hot encoding.",
      "Bagaimana Anda men-deploy model ke produksi?",
    ],
  },
  // Hasil AI untuk pelamar lain di lowongan Backend Developer (job_id = 1)
  {
    id: 201, candidate_id: 21, job_id: 1, match_score: 92, created_at: "2026-11-13",
    candidate_feedback: "",
    hr_strengths: ["3 tahun REST API Laravel", "Query MySQL teroptimasi", "Terbiasa Git flow"],
    hr_gaps: ["Docker", "CI/CD pipeline"],
    interview_questions: [
      "Ceritakan bagaimana Anda men-deploy aplikasi Laravel ke produksi dan masalah apa yang pernah dihadapi tanpa Docker.",
      "Bagaimana Anda merancang pipeline CI/CD sederhana untuk proyek tim?",
      "Jelaskan satu kasus optimasi query MySQL yang pernah Anda lakukan beserta hasil ukurnya.",
    ],
  },
  {
    id: 202, candidate_id: 22, job_id: 1, match_score: 85, created_at: "2026-11-13",
    candidate_feedback: "",
    hr_strengths: ["Desain API dan autentikasi (JWT/Sanctum)", "Pernah memimpin modul pembayaran"],
    hr_gaps: ["Testing otomatis", "Docker"],
    interview_questions: [
      "Bagaimana strategi testing yang Anda terapkan pada modul pembayaran?",
      "Ceritakan pengalaman Anda memimpin satu modul dan cara membagi tugas dalam tim.",
      "Apa risiko keamanan utama pada API autentikasi dan cara Anda memitigasinya?",
    ],
  },
  {
    id: 203, candidate_id: 23, job_id: 1, match_score: 71, created_at: "2026-11-13",
    candidate_feedback: "",
    hr_strengths: ["Dasar PHP dan MySQL baik", "Magang 8 bulan"],
    hr_gaps: ["Pengalaman produksi", "Laravel lanjutan", "Docker"],
    interview_questions: [
      "Jelaskan arsitektur proyek Laravel terbesar yang pernah Anda buat.",
      "Bagaimana Anda menangani migrasi database pada proyek tim?",
      "Apa yang Anda pelajari selama magang yang paling relevan dengan posisi ini?",
    ],
  },
  {
    id: 204, candidate_id: 24, job_id: 1, match_score: 54, created_at: "2026-11-13",
    candidate_feedback: "",
    hr_strengths: ["Antusias belajar", "Proyek pribadi berbasis Node.js"],
    hr_gaps: ["PHP/Laravel", "MySQL lanjutan", "Pengalaman kerja tim"],
    interview_questions: [
      "Apa alasan Anda tertarik beralih dari Node.js ke Laravel?",
      "Ceritakan proyek pribadi yang paling Anda banggakan dan tantangan teknisnya.",
      "Bagaimana Anda belajar teknologi baru dalam waktu singkat?",
    ],
  },
];

export const applications: Application[] = [
  // Lamaran pelamar demo
  { id: 1, job_match_id: 103, candidate_id: 1, job_id: 2, status: "pending", applied_at: "2026-11-10" },
  { id: 2, job_match_id: 104, candidate_id: 1, job_id: 4, status: "shortlisted", applied_at: "2026-11-06" },
  // Lamaran ke lowongan Backend Developer
  { id: 42, job_match_id: 201, candidate_id: 21, job_id: 1, status: "shortlisted", applied_at: "2026-11-13" },
  { id: 104, job_match_id: 202, candidate_id: 22, job_id: 1, status: "pending", applied_at: "2026-11-13" },
  { id: 17, job_match_id: 203, candidate_id: 23, job_id: 1, status: "pending", applied_at: "2026-11-13" },
  { id: 63, job_match_id: 204, candidate_id: 24, job_id: 1, status: "pending", applied_at: "2026-11-14" },
];

export const applicationStatusMeta: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  pending: { label: "Menunggu Review", className: "bg-slate-100 text-slate-700" },
  shortlisted: { label: "Dipanggil Wawancara", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Ditolak", className: "bg-red-50 text-red-700" },
};

export const jobStatusMeta: Record<JobStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-emerald-50 text-emerald-700" },
  closed: { label: "Closed", className: "bg-slate-100 text-slate-600" },
  flagged: { label: "Flagged (terindikasi penipuan)", className: "bg-red-50 text-red-700" },
};

// ---- Helper (pengganti JOIN di database) ----

export function getUser(id: number): User | undefined {
  return users.find((u) => u.id === id);
}

export function getJob(id: number): Job | undefined {
  return jobs.find((j) => j.id === id);
}

export function getApplicantsForJob(jobId: number): ApplicantRow[] {
  return applications
    .filter((a) => a.job_id === jobId)
    .flatMap((application) => {
      const match = jobMatches.find((m) => m.id === application.job_match_id);
      const candidate = getUser(application.candidate_id);
      return match && candidate ? [{ application, match, candidate }] : [];
    });
}