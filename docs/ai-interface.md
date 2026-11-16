# Antarmuka AI HireMatch

Backend memanggil AI hanya melalui satu pintu: `src/lib/scorer.ts`.

- `USE_MOCK=true` (default): memakai `src/lib/scoring.mock.ts`.
- `USE_MOCK=false`: memuat `src/lib/scoring.ts` milik tim AI secara lazy.
- Jika modul AI belum ada, ekspor tidak lengkap, atau output tidak sesuai skema,
  backend mengembalikan `503 AI_UNAVAILABLE`. Tidak ada fallback diam-diam ke mock.

## Ekspor yang wajib disediakan `src/lib/scoring.ts`

```ts
import type {
  CvValidationResult,
  JobScamCheckResult,
  ScoreOutput,
} from "./types";

export async function checkJobScam(
  text: string,
): Promise<JobScamCheckResult>;

export async function validateCv(
  text: string,
): Promise<CvValidationResult>;

export async function scoreCandidate(
  jd: string,
  cvAnon: string,
  mustHave: string[],
): Promise<ScoreOutput>;
```

Jangan mengubah tanda tangan, nama field, atau tipe hasil tanpa kesepakatan
bertiga. `src/lib/types.ts` adalah kontrak backend; `src/types/contract.ts`
adalah kontrak bersama yang belum diisi.

## Input

### `checkJobScam(text)`

`text` adalah gabungan judul, deskripsi, dan requirements lowongan. Backend
hanya memakai hasilnya untuk menentukan status awal lowongan:

- aman -> `open`
- tidak aman -> `flagged`

### `validateCv(text)`

`text` adalah teks mentah hasil ekstraksi PDF. Teks ini belum dianonimkan karena
validasi hanya menilai apakah isinya layak diproses.

### `scoreCandidate(jd, cvAnon, mustHave)`

- `jd`: judul + deskripsi lowongan.
- `cvAnon`: teks CV yang **sudah dianonimkan** oleh backend. Jangan menganggap
  input ini berisi nama, email, telepon, NIK, alamat, tanggal lahir, agama,
  status pernikahan, gender, atau almamater asli.
- `mustHave`: maksimal 12 kata kunci yang diekstrak backend dari requirements.

Backend hanya mengirim hasil anonim ke AI. Teks CV asli tetap disimpan di
`users.cv_text` untuk kebutuhan internal dan tidak pernah dikirim ke HRD.

## Output

### `JobScamCheckResult`

```json
{
  "is_safe": false,
  "reason": "Lowongan meminta biaya administrasi di muka."
}
```

`reason` opsional untuk lowongan aman, maksimal 500 karakter.

### `CvValidationResult`

```json
{
  "is_valid_cv": true
}
```

Atau:

```json
{
  "is_valid_cv": false,
  "reason": "Teks CV tidak memuat pengalaman atau keahlian yang cukup."
}
```

### `ScoreOutput`

```json
{
  "total": 78,
  "sim": 72,
  "mustScore": 85,
  "skor_kompetensi": 79,
  "missing": ["postgresql"],
  "kekuatan": [
    {
      "poin": "Menguasai TypeScript",
      "bukti": "Pengalaman membangun API TypeScript di PT Contoh."
    }
  ],
  "celah": ["Belum ada bukti pengalaman PostgreSQL."],
  "candidateFeedback": "Skor kecocokan CV Anda 78/100. Perkuat bukti PostgreSQL.",
  "pertanyaan_wawancara": [
    "Ceritakan pengalaman Anda membangun API dengan TypeScript.",
    "Bagaimana Anda merancang skema PostgreSQL untuk data transaksi?",
    "Apa tantangan terbesar saat melakukan optimasi query?"
  ]
}
```

Aturan validasi backend:

- `total`, `sim`, `mustScore`, dan `skor_kompetensi` berupa bilangan bulat 0-100.
- `missing`, `kekuatan`, `celah`, dan `pertanyaan_wawancara` berupa array.
- `pertanyaan_wawancara` **harus tepat 3**.
- `kekuatan` berisi objek `{ "poin": string, "bukti": string }`.
- `candidateFeedback` tidak boleh memuat identitas kandidat.
- Output yang tidak valid ditolak dengan `503 AI_UNAVAILABLE`, bukan disimpan
  sebagian.

## Perilaku mock

`src/lib/scoring.mock.ts` deterministik dan tidak memanggil jaringan:

- Scam: frasa `biaya administrasi`, `transfer dulu`, atau `bayar dulu`.
- CV valid jika teks padat lebih dari 200 karakter.
- Skor dihitung dari irisan kata kunci lowongan dan CV, dibatasi 40-95.
- Selalu menghasilkan tepat 3 pertanyaan wawancara.
- Tidak ada unsur acak.

Mock hanya untuk development/hackathon, bukan pengganti kualitas model AI.

## Anonimisasi

`src/lib/anonymize.ts` mengganti pola berikut sebelum teks dikirim ke AI:

- email -> `[EMAIL]`
- NIK 16 digit -> `[NIK]`
- telepon Indonesia (`+62`, `62`, `08`) -> `[TELEPON]`
- tanggal lahir/TTL dan tanggal umum -> `[TANGGAL_LAHIR]` / `[TANGGAL]`
- usia -> `[USIA]`
- gender -> `[GENDER]`
- status pernikahan -> `[STATUS_PERKAWINAN]`
- agama -> `[AGAMA]`
- alamat berlabel -> `[ALAMAT]`
- almamater berlabel/kata kunci kampus -> `[ALMAMATER]`
- semua kemunculan nama dari `users.name` dan bagian namanya (minimal 3
  karakter) -> `[NAMA]`

Keterbatasan regex:

- Nama panggilan, inisial, atau nama yang tidak sama dengan `users.name` bisa
  lolos.
- Alamat tanpa label, PDF hasil scan, dan format tanggal yang tidak umum bisa
  lolos.
- Regex dapat menghapus bagian yang bukan data pribadi (over-redaction). Ini
  lebih aman daripada membocorkan identitas.
- Anonimisasi berbasis teks tidak menjamin AI tidak menyimpulkan identitas dari
  konteks. Jangan pernah mengirim file PDF asli ke AI.

## Checklist integrasi tim AI

1. Isi `src/lib/scoring.ts` dengan tiga ekspor di atas.
2. Jalankan `npm test` untuk memastikan helper backend tetap sehat.
3. Set `USE_MOCK=false` di `.env.local`.
4. Uji upload CV dan pastikan output lolos validasi.
5. Jangan mengubah `src/lib/scorer.ts`, `src/lib/matching.ts`, atau schema DB.
6. Jika butuh field baru pada `ScoreOutput`, ajukan perubahan kontrak di
   `docs/contract-proposal.md` terlebih dahulu.
