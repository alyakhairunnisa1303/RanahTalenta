This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend dan database

Salin `.env.example` menjadi `.env.local`, ganti `POSTGRES_PASSWORD` dan `AUTH_SECRET` dengan nilai acak milik Anda, lalu pastikan password pada `DATABASE_URL` sama dengan `POSTGRES_PASSWORD`. Jalankan PostgreSQL lokal dan buat tabel:

```bash
docker compose --env-file .env.local up -d postgres
npm run db:setup
npm run db:seed
npm run dev
```

`npm run db:seed` menambahkan tiga akun HRD demo dan sepuluh lowongan contoh secara idempoten. Email login: `hrd@nusantaradigital.example.test`, `talent@bumisehat.example.test`, dan `karier@kreasifinansial.example.test`. Password semua akun: `DemoHRD2026!`. Akun ini hanya untuk pengembangan lokal; jangan gunakan data kredensial demo di deployment.

Untuk mengisi data uji HRD, jalankan `npm run db:seed:applicants`. Perintah ini menambahkan 30 pelamar demo dengan CV, skor kecocokan simulasi, kekuatan/celah, pertanyaan wawancara, dan lima lamaran per pelamar. Prosesnya idempoten dan tidak menghapus data yang ada. Email pelamar berurutan dari `pelamar.demo.01@example.test` sampai `pelamar.demo.30@example.test`; password semua akun: `DemoPelamar2026!`. Skor seed adalah data simulasi untuk menguji tampilan dan alur HRD, bukan hasil panggilan model AI.

Pengguna mendaftar dan login melalui API backend. Password di-hash dengan `scrypt`, sesi menggunakan cookie `HttpOnly` bertanda tangan, dan akses lowongan/lamaran dibatasi menurut pemilik dan role. Pelamar, lamaran, status, skor, dan teks surat disimpan di PostgreSQL. Lampiran PDF, DOC, DOCX, atau TXT (maksimal 5 MB) disimpan sebagai file privat di `data/application-documents/`; metadata path-nya ada di database.

Untuk deployment, gunakan PostgreSQL terkelola dan disk privat persisten atau object storage. Atur `APPLICATION_DOCUMENTS_DIR` ke lokasi persisten dan `DATABASE_SSL=true` bila penyedia database mewajibkan TLS. Buat backup database dan lampiran bersama-sama. Email belum diverifikasi; pendaftaran HRD menyimpan status perusahaan belum terverifikasi.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
