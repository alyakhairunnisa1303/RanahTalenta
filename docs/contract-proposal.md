# Usulan Kontrak Bersama

`src/types/contract.ts` masih kosong. Backend sudah berjalan dengan tipe internal
di `src/lib/types.ts` dan respons API yang memakai `snake_case` untuk field yang
berasal dari database. Dokumen ini adalah usulan untuk dibahas bertiga
(backend, frontend, AI). Belum ada perubahan pada `src/types/contract.ts`.

## Keputusan yang perlu disepakati

1. **Nama field API**: backend memakai `snake_case` untuk field database
   (`is_verified`, `company_name`, `match_score`, `candidate_feedback`), tetapi
   `ScoreOutput` AI memakai `camelCase` (`mustScore`, `candidateFeedback`) agar
   sesuai kontrak AI. Usulan: pertahankan pemisahan ini dan jangan mencampur
   keduanya dalam satu objek API.
2. **Envelope**: semua respons sukses `{ ok: true, data: ... }`, semua respons
   gagal `{ ok: false, error: { code, message } }`.
3. **Label skor**: hijau >= 80, kuning 60-79, merah < 60.
4. **Blind screening**: identitas kandidat hanya muncul setelah status
   `shortlisted` dan hanya untuk HRD pemilik lowongan.

## Usulan tipe TypeScript

```ts
export type Role = "candidate" | "hrd";

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type ScoreLabel = {
  color: "green" | "yellow" | "red";
  label: "Highly Recommended" | "Potential" | "Not Recommended";
};

export type ScoreOutput = {
  total: number;
  sim: number;
  mustScore: number;
  skor_kompetensi: number;
  missing: string[];
  kekuatan: { poin: string; bukti: string }[];
  celah: string[];
  candidateFeedback: string;
  pertanyaan_wawancara: string[];
};

export type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  company_name: string | null;
  legal_number: string | null;
  phone: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
  has_cv: boolean;
  created_at: string;
};

export type JobSummary = {
  id: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  salary_range: string | null;
  status: "open" | "closed" | "flagged";
  created_at: string;
  company_name: string | null;
};

export type MatchSummary = {
  job_id: number;
  title: string;
  company_name: string | null;
  location: string;
  job_status: "open" | "closed" | "flagged";
  match_score: number;
  label: ScoreLabel;
  ringkasan: string;
  application: { id: number; status: "pending" | "shortlisted" | "rejected" } | null;
};

export type MatchDetail = {
  total: number;
  sim: number | null;
  must_score: number | null;
  skor_kompetensi: number | null;
  missing: string[];
  kekuatan: { poin: string; bukti: string }[];
  celah: string[];
  candidate_feedback: string;
  pertanyaan_wawancara: string[];
  label: ScoreLabel;
};

export type CandidateApplication = {
  id: number;
  status: "pending" | "shortlisted" | "rejected";
  applied_at: string;
  job: {
    id: number;
    title: string;
    location: string;
    status: "open" | "closed" | "flagged";
    company_name: string | null;
  };
  match: { match_score: number; label: ScoreLabel };
};

export type HrdApplicant = {
  application_id: number;
  candidate_label: string;
  status: "pending" | "shortlisted" | "rejected";
  match_score: number;
  score_label: ScoreLabel;
  ringkasan: string;
  applied_at: string;
  candidate?: {
    name: string;
    email: string;
    phone: string | null;
    portfolio_url: string | null;
  };
};

export type HrdApplicantDetail = HrdApplicant & {
  job: { id: number; title: string };
  sim: number | null;
  must_score: number | null;
  skor_kompetensi: number | null;
  missing: string[];
  kekuatan: { poin: string; bukti: string }[];
  celah: string[];
  candidate_feedback: string;
  pertanyaan_wawancara: string[];
};
```

## Catatan implementasi

- `candidate` pada `HrdApplicant` sengaja opsional. Field ini tidak ada saat
  status `pending` atau `rejected`.
- `ScoreOutput` tetap camelCase karena merupakan keluaran modul AI. API
  menerjemahkannya menjadi `must_score`, `skor_kompetensi`, dan
  `candidate_feedback` saat menyimpan/mengembalikan data.
- Jika frontend menginginkan seluruh API memakai `camelCase`, perubahan harus
  dilakukan serentak di route dan dokumentasi sebelum integrasi. Jangan
  menambahkan alias ganda karena akan membingungkan konsumen API.
- Kontrak ini belum mengikat sampai disepakati. Backend saat ini adalah sumber
  kebenaran sementara untuk perilaku endpoint.
