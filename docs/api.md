# API HireMatch AI

Base URL development: `http://localhost:3000`

Semua endpoint kecuali health, registrasi, verifikasi, login, daftar lowongan
publik, dan detail lowongan publik membutuhkan cookie sesi
`hirematch_session`.

## Format respons

Sukses:

```json
{ "ok": true, "data": {} }
```

Gagal:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input tidak valid: ..."
  }
}
```

- Semua respons API memakai `Cache-Control: no-store`.
- Field yang berasal dari database memakai `snake_case`
  (`company_name`, `match_score`, `candidate_feedback`, `created_at`).
- Password, `verify_token`, `cv_path`, dan `cv_text` tidak pernah dikembalikan
  ke klien.
- Tanggal dikirim sebagai string ISO 8601.

## Kode status dan error umum

| Status | Kode | Arti |
| --- | --- | --- |
| 400 | `BAD_REQUEST`, `VALIDATION_ERROR` | Body/parameter tidak valid, PDF rusak |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` | Belum login atau kredensial salah |
| 403 | `FORBIDDEN`, `EMAIL_NOT_VERIFIED` | Role tidak sesuai / email belum diverifikasi |
| 404 | `NOT_FOUND` | Data tidak ada atau bukan milik pengguna |
| 409 | `CONFLICT`, `JOB_CLOSED` | Duplikat lamaran / lowongan sudah ditutup |
| 413 | `PAYLOAD_TOO_LARGE` | CV lebih dari 5 MB |
| 429 | `TOO_MANY_REQUESTS` | Rate limit terlampaui |
| 503 | `AI_UNAVAILABLE`, `MAIL_UNAVAILABLE` | Modul AI / SMTP belum siap |

## Rate limit

Rate limit disimpan di memori proses (reset saat server restart):

- Registrasi candidate + HRD: 10 per jam per IP (kuota bersama).
- Login: 10 per 15 menit per IP dan 10 per 15 menit per email.
- Upload CV: 10 per jam per akun candidate.

Jika deploy multi-instance, ganti penyimpanan in-memory dengan Redis.

## Auth

### POST `/api/auth/register/candidate`

Body:

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "password": "Rahasia123!",
  "phone": "081234567890",
  "portfolioUrl": "https://example.com/budi"
}
```

`phone` dan `portfolioUrl` opsional. Password 8-72 karakter.

Respons `201`:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": 1,
      "name": "Budi Santoso",
      "email": "budi@example.com",
      "role": "candidate",
      "company_name": null,
      "legal_number": null,
      "phone": "081234567890",
      "portfolio_url": "https://example.com/budi",
      "is_verified": false,
      "has_cv": false,
      "created_at": "2026-11-14T06:00:00.000Z"
    },
    "email_sent": false,
    "message": "Registrasi berhasil. Cek email untuk memverifikasi akun sebelum login."
  }
}
```

Tanpa SMTP di development, tautan verifikasi dicetak di console server dengan
prefix `[MAILER:DEV]`.

### POST `/api/auth/register/hrd`

Body sama, ditambah `companyName` dan `legalNumber` wajib. Email publik seperti
`gmail.com`, `yahoo.com`, `outlook.com`, `hotmail.com`, `icloud.com`,
`ymail.com`, dan `proton.me` ditolak.

### GET `/api/auth/verify?token=...`

Token sekali pakai. Respons `200`:

```json
{
  "ok": true,
  "data": {
    "verified": true,
    "message": "Email berhasil diverifikasi. Silakan login."
  }
}
```

### POST `/api/auth/login`

```json
{ "email": "budi@example.com", "password": "Rahasia123!" }
```

Berhasil: `200`, data `{ user }`, dan `Set-Cookie: hirematch_session=...`
(httpOnly, sameSite=lax, secure hanya production, umur default 7 hari).

Gagal: `401 INVALID_CREDENTIALS`, atau `403 EMAIL_NOT_VERIFIED`.

### POST `/api/auth/logout`

Menghapus cookie sesi. Respons `200 { "message": "Logout berhasil." }`.

### GET `/api/auth/me`

Mengembalikan `{ user }` yang sedang login.

## Lowongan

### GET `/api/jobs`

Publik. Hanya lowongan berstatus `open`, maksimal 100, terbaru dahulu.

```json
{
  "ok": true,
  "data": {
    "jobs": [
      {
        "id": 1,
        "title": "Backend Engineer",
        "description": "...",
        "requirements": "...",
        "location": "Jakarta (Hybrid)",
        "salary_range": "Rp10.000.000 - Rp18.000.000",
        "status": "open",
        "created_at": "2026-11-14T06:00:00.000Z",
        "company_name": "PT HireMatch Nusantara"
      }
    ]
  }
}
```

### POST `/api/jobs`

HRD terverifikasi. Backend menjalankan pemeriksaan scam pada judul + deskripsi +
requirements.

```json
{
  "title": "Backend Engineer",
  "description": "Kami mencari backend engineer untuk membangun API...",
  "requirements": "Menguasai TypeScript, Node.js, PostgreSQL...",
  "location": "Jakarta (Hybrid)",
  "salaryRange": "Rp10.000.000 - Rp18.000.000"
}
```

`salaryRange` opsional. Respons `201`:

```json
{
  "ok": true,
  "data": {
    "job": {
      "id": 4,
      "title": "Backend Engineer",
      "status": "open",
      "...": "..."
    },
    "scam_reason": null
  }
}
```

Jika terindikasi scam, lowongan tetap dibuat dengan status `flagged` dan
`scam_reason` berisi alasan. Lowongan `flagged` tidak muncul di daftar publik.

> Catatan: alasan scam tidak disimpan di database karena schema tidak punya
> kolomnya. Alasan hanya dikembalikan pada respons POST/PATCH. Status `flagged`
> tetap tersimpan dan terlihat oleh pemilik.

### GET `/api/jobs/[id]`

Lowongan `open` bisa diakses publik. Lowongan `closed`/`flagged` hanya bisa
diakses HRD pemiliknya; pengguna lain mendapat `404`.

### PATCH `/api/jobs/[id]`

HRD pemilik. Semua field opsional, minimal satu:

```json
{
  "title": "...",
  "description": "...",
  "requirements": "...",
  "location": "...",
  "salaryRange": "...",
  "status": "open"
}
```

`status` hanya boleh `open` atau `closed`; `flagged` hanya ditetapkan sistem.
Jika konten diubah atau status diminta `open`, pemeriksaan scam dijalankan ulang.
Konten aman dapat membuka kembali lowongan `flagged`. Respons sama dengan POST.

### GET `/api/hrd/jobs`

HRD terverifikasi. Semua lowongan miliknya, termasuk `closed`/`flagged`, dengan
jumlah `applicants` dan `matches`.

## CV, matching, dan skor

### POST `/api/cv/upload`

Candidate. `multipart/form-data`, field file bernama `cv`.

Aturan file:

- ekstensi `.pdf`, MIME `application/pdf`, magic bytes `%PDF-`;
- maksimal 5 MB;
- PDF harus berbasis teks (bukan hasil scan);
- teks minimal 50 karakter dan harus lolos `validateCv` dari modul AI.

Alur backend:

1. Teks asli disimpan di `users.cv_text`; file disimpan di
   `storage/cvs/<uuid>.pdf` (di luar public).
2. Nama dan data pribadi dianonimkan sebelum dikirim ke AI.
3. Scoring dilakukan untuk maksimal 10 lowongan `open` terbaru, konkurensi 3.
4. Hasil di-upsert ke `job_matches`. Upload ulang menimpa skor lama; match tanpa
   lamaran untuk lowongan yang tidak lagi open dihapus. Match yang sudah punya
   lamaran dipertahankan agar riwayat lamaran tidak hilang.

Respons `200`:

```json
{
  "ok": true,
  "data": {
    "message": "CV berhasil diunggah dan dianalisis.",
    "cv": { "has_cv": true, "characters": 937 },
    "matches": [
      {
        "job_id": 1,
        "title": "Backend Engineer",
        "match_score": 74,
        "label": { "color": "yellow", "label": "Potential" },
        "ringkasan": "Skor kecocokan CV Anda 74/100..."
      }
    ],
    "failed_jobs": []
  }
}
```

Jika modul AI gagal total, respons `503 AI_UNAVAILABLE`; CV sudah tersimpan dan
bisa diunggah ulang setelah AI siap. Kegagalan sebagian dicatat di
`failed_jobs`.

Catatan implementasi PDF: `pdf-parse@2.4.5` tidak lagi menyediakan
`lib/pdf-parse.js`. Backend memakai kelas `PDFParse` + `getText()` dan memuat
paket lewat `createRequire` agar worker tidak di-bundle salah oleh Next.

### GET `/api/matches`

Candidate. Semua hasil matching miliknya, urut skor menurun.

```json
{
  "ok": true,
  "data": {
    "matches": [
      {
        "job_id": 1,
        "title": "Backend Engineer",
        "company_name": "PT HireMatch Nusantara",
        "location": "Jakarta (Hybrid)",
        "job_status": "open",
        "match_score": 74,
        "label": { "color": "yellow", "label": "Potential" },
        "ringkasan": "...",
        "application": null
      }
    ]
  }
}
```

`application` berisi `{ id, status }` jika sudah melamar, selain itu `null`.

### GET `/api/matches/[jobId]`

Candidate. Detail skor untuk satu lowongan:

```json
{
  "ok": true,
  "data": {
    "job": { "id": 1, "title": "Backend Engineer", "...": "..." },
    "match": {
      "total": 74,
      "sim": 50,
      "must_score": 90,
      "skor_kompetensi": 70,
      "missing": ["relevan"],
      "kekuatan": [{ "poin": "Menguasai typescript", "bukti": "..." }],
      "celah": ["Belum ada bukti untuk \"relevan\" di CV."],
      "candidate_feedback": "...",
      "pertanyaan_wawancara": ["...", "...", "..."],
      "label": { "color": "yellow", "label": "Potential" }
    },
    "application": null
  }
}
```

## Lamaran candidate

### POST `/api/applications`

```json
{ "jobId": 1 }
```

Syarat: sudah punya `job_match` untuk lowongan tersebut dan lowongan masih
`open`. Tidak ada panggilan AI pada tahap ini.

Respons `201` berisi `application`, ringkasan `job`, dan `match`. Error:

- `404` — belum ada hasil matching; upload CV dulu.
- `409 JOB_CLOSED` — lowongan sudah ditutup.
- `409 CONFLICT` — sudah pernah melamar.

### GET `/api/applications/mine`

Candidate. Riwayat lamaran, urut terbaru, lengkap dengan status dan skor.

## HRD dan blind screening

### GET `/api/hrd/jobs/[id]/applicants`

HRD pemilik. Daftar pelamar diurutkan skor menurun (leaderboard).

Untuk status `pending` dan `rejected`, respons **tidak boleh** memuat nama,
email, telepon, portfolio, atau CV. Field yang keluar hanya nomor kandidat,
skor, label, ringkasan, status, dan waktu melamar:

```json
{
  "application_id": 1,
  "candidate_label": "Kandidat #1",
  "status": "pending",
  "match_score": 74,
  "score_label": { "color": "yellow", "label": "Potential" },
  "ringkasan": "...",
  "applied_at": "2026-11-14T06:10:00.000Z"
}
```

Setelah `shortlisted`, barulah field `candidate` muncul:

```json
{
  "candidate": {
    "name": "Budi Santoso",
    "email": "budi@example.com",
    "phone": "081234567890",
    "portfolio_url": "https://example.com/budi"
  }
}
```

HRD lain mendapat `404`.

### GET `/api/hrd/applications/[id]`

HRD pemilik. Detail lamaran berisi:

- `kekuatan`, `celah`, `missing`;
- `pertanyaan_wawancara` (tepat 3);
- `match_score`, `sim`, `must_score`, `skor_kompetensi`, `score_label`;
- `ringkasan` dan `candidate_feedback`;
- identitas kandidat hanya jika `shortlisted`.

### PATCH `/api/hrd/applications/[id]`

HRD pemilik.

```json
{ "status": "shortlisted" }
```

Nilai yang diterima: `shortlisted` atau `rejected`. Identitas kandidat hanya
dikembalikan setelah status menjadi `shortlisted`.

## Akun

### DELETE `/api/me`

Semua role yang login. Menghapus akun beserta lowongan, match, dan lamaran
terkait (cascade), menghapus file CV dari `storage/cvs`, lalu menghapus cookie
sesi. Respons `200` berisi pesan konfirmasi.

## Seed dan akun demo

Jalankan:

```powershell
npm run db:seed
```

Akun yang dibuat/diperbarui:

| Role | Email | Password |
| --- | --- | --- |
| HRD | `hrd@hirematch.co.id` | `Hrd123!` |
| Candidate | `budi@example.com` | `Kandidat123!` |
| Candidate | `siti@example.com` | `Kandidat123!` |

Tiga lowongan `open`: Backend Engineer, Frontend Engineer, Data Analyst.

## Environment

Lihat `.env.example`. Yang wajib: `DATABASE_URL`, `AUTH_SECRET` (minimal 32
karakter). `USE_MOCK=true` memakai mock AI. SMTP opsional; tanpa SMTP, tautan
verifikasi dicetak ke console pada development.

## Batasan yang diketahui

- Rate limit in-memory, belum cocok untuk multi-instance.
- Alasan scam tidak dipersistensikan.
- Matching hanya untuk 10 lowongan open terbaru saat upload.
- Blinded identity hanya dibuka untuk `shortlisted`; `rejected` tetap anonim.
- Anonimisasi regex bersifat best-effort (lihat `docs/ai-interface.md`).
- Belum ada endpoint resend verification email.
- `next start` di HTTP tidak mengirim cookie `secure`; gunakan `npm run dev`
  untuk pengujian lokal.
