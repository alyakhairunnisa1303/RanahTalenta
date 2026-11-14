# Contoh Request Thunder Client

Prasyarat:

1. Jalankan `npm run dev` (bukan `npm start` di HTTP, karena cookie sesi memakai
   flag `secure` di production).
2. Jalankan `npm run db:seed` sekali.
3. Di Thunder Client, buat Environment dengan `baseUrl = http://localhost:3000`.
4. Aktifkan cookie jar Thunder Client. Login akan menyimpan cookie
   `hirematch_session` secara otomatis. Jika sesi hilang, ulangi request login.

Gunakan akun seed:

| Role | Email | Password |
| --- | --- | --- |
| HRD | `hrd@hirematch.co.id` | `Hrd123!` |
| Candidate | `budi@example.com` | `Kandidat123!` |

## 1. Health check

- Method: `GET`
- URL: `{{baseUrl}}/api/health`
- Ekspektasi: `200`, `database: "up"`.

## 2. Login HRD

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/login`
- Body (JSON):

```json
{
  "email": "hrd@hirematch.co.id",
  "password": "Hrd123!"
}
```

- Ekspektasi: `200`, `role: "hrd"`, cookie sesi tersimpan.

## 3. Daftar lowongan milik HRD

- Method: `GET`
- URL: `{{baseUrl}}/api/hrd/jobs`
- Ekspektasi: `200`, berisi 3 lowongan seed dengan `applicants` dan `matches`.

## 4. Buat lowongan aman

- Method: `POST`
- URL: `{{baseUrl}}/api/jobs`
- Body (JSON):

```json
{
  "title": "QA Engineer",
  "description": "Kami mencari QA Engineer untuk menguji API dan antarmuka aplikasi secara otomatis maupun manual.",
  "requirements": "Menguasai pengujian API, Postman, dan dasar otomasi. Teliti dan mampu menulis test case yang jelas.",
  "location": "Remote",
  "salaryRange": "Rp7.000.000 - Rp12.000.000"
}
```

- Ekspektasi: `201`, `job.status = "open"`, `scam_reason = null`.

## 5. Buat lowongan scam

- Method: `POST`
- URL: `{{baseUrl}}/api/jobs`
- Body (JSON):

```json
{
  "title": "Admin Online",
  "description": "Lowongan admin online. Kandidat diminta transfer dulu biaya administrasi sebelum bekerja.",
  "requirements": "Bisa mengoperasikan komputer dan memiliki koneksi internet.",
  "location": "Remote",
  "salaryRange": "Rp5.000.000"
}
```

- Ekspektasi: `201`, `job.status = "flagged"`, `scam_reason` berisi frasa
  `biaya administrasi`.
- Cek `GET {{baseUrl}}/api/jobs`: lowongan ini tidak muncul.

## 6. Perbaiki lowongan flagged

- Method: `PATCH`
- URL: `{{baseUrl}}/api/jobs/{{scamJobId}}`
- Body (JSON):

```json
{
  "description": "Lowongan admin online untuk mengelola pesanan dan berkomunikasi dengan pelanggan. Proses rekrutmen tidak memungut biaya."
}
```

- Ekspektasi: `200`, `job.status = "open"`, dan lowongan muncul di daftar
  publik.

## 7. Detail lowongan publik

- Method: `GET`
- URL: `{{baseUrl}}/api/jobs/1`
- Ekspektasi: `200`, data lowongan dengan `company_name`.

## 8. Login candidate

- Method: `POST`
- URL: `{{baseUrl}}/api/auth/login`
- Body (JSON):

```json
{
  "email": "budi@example.com",
  "password": "Kandidat123!"
}
```

- Ekspektasi: `200`, `role: "candidate"`.

## 9. Upload CV

- Method: `POST`
- URL: `{{baseUrl}}/api/cv/upload`
- Body: pilih tab **Form** / **Multipart**.
- Tambahkan field:
  - Key: `cv`
  - Type: `File`
  - Value: pilih file PDF teks (bukan hasil scan), maksimal 5 MB.

- Ekspektasi: `200`, `cv.has_cv = true`, dan `matches` berisi skor untuk
  lowongan open.
- Jika memakai mock AI, CV harus memiliki teks lebih dari 200 karakter.
- PDF hasil scan akan ditolak dengan `400`.

## 10. Lihat hasil matching

- Method: `GET`
- URL: `{{baseUrl}}/api/matches`
- Ekspektasi: daftar match urut skor menurun, dengan `label` warna.

## 11. Detail skor satu lowongan

- Method: `GET`
- URL: `{{baseUrl}}/api/matches/1`
- Ekspektasi: `match.sim`, `match.must_score`, `match.kekuatan`,
  `match.celah`, dan tepat 3 `pertanyaan_wawancara`.

## 12. Lamar lowongan

- Method: `POST`
- URL: `{{baseUrl}}/api/applications`
- Body (JSON):

```json
{ "jobId": 1 }
```

- Ekspektasi: `201`, `status = "pending"`.
- Ulangi request yang sama: `409 CONFLICT`.

## 13. Riwayat lamaran candidate

- Method: `GET`
- URL: `{{baseUrl}}/api/applications/mine`
- Ekspektasi: satu lamaran dengan skor dan label.

## 14. Login HRD lagi

Login ulang sebagai HRD (langkah 2), lalu buka leaderboard.

## 15. Leaderboard blind screening

- Method: `GET`
- URL: `{{baseUrl}}/api/hrd/jobs/1/applicants`
- Ekspektasi sebelum shortlist:
  - `application_id`, `candidate_label = "Kandidat #1"`, skor, label,
    ringkasan;
  - **tidak ada** nama, email, telepon, portfolio, atau CV.
- Urutan berdasarkan skor menurun.

## 16. Detail lamaran (masih blind)

- Method: `GET`
- URL: `{{baseUrl}}/api/hrd/applications/1`
- Ekspektasi: `kekuatan`, `celah`, 3 pertanyaan; tanpa identitas kandidat.

## 17. Shortlist kandidat

- Method: `PATCH`
- URL: `{{baseUrl}}/api/hrd/applications/1`
- Body (JSON):

```json
{ "status": "shortlisted" }
```

- Ekspektasi: `200`, status berubah, dan field `candidate` mulai muncul.

## 18. Verifikasi identitas terbuka

- Method: `GET`
- URL: `{{baseUrl}}/api/hrd/applications/1`
- Ekspektasi: `candidate.name`, `email`, `phone`, `portfolio_url` muncul.

## 19. Tolak kandidat (opsional)

- Method: `PATCH`
- URL: `{{baseUrl}}/api/hrd/applications/1`
- Body (JSON):

```json
{ "status": "rejected" }
```

- Ekspektasi: identitas kembali tidak dikembalikan.

## 20. Hapus akun (hati-hati)

- Method: `DELETE`
- URL: `{{baseUrl}}/api/me`
- Gunakan akun disposable, jangan akun seed, karena seluruh lowongan, match,
  lamaran, dan file CV ikut terhapus.
- Ekspektasi: `200`, cookie sesi dihapus; `GET /api/auth/me` berikutnya `401`.

## Contoh error

Belum login:

```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Silakan login terlebih dahulu."
  }
}
```

Lamaran duplikat:

```json
{
  "ok": false,
  "error": {
    "code": "CONFLICT",
    "message": "Anda sudah melamar lowongan ini."
  }
}
```

Lowongan ditutup:

```json
{
  "ok": false,
  "error": {
    "code": "JOB_CLOSED",
    "message": "Lowongan sudah ditutup."
  }
}
```

## Alternatif curl

Login dan simpan cookie:

```powershell
curl.exe -s -c cookies.txt -H "Content-Type: application/json" `
  -d '{"email":"budi@example.com","password":"Kandidat123!"}' `
  http://localhost:3000/api/auth/login
```

Upload CV:

```powershell
curl.exe -s -b cookies.txt -F "cv=@C:/path/cv.pdf;type=application/pdf" `
  http://localhost:3000/api/cv/upload
```

Daftar match:

```powershell
curl.exe -s -b cookies.txt http://localhost:3000/api/matches
```
