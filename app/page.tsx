import { Suspense } from "react";
import Link from "next/link";
import Icon, { type IconName } from "../src/components/Icons";
import ScoreBadge from "../src/components/ScoreBadge";
import JobBoard from "../src/components/JobBoard";
import HeroSearch from "../src/components/HeroSearch";
import { getUser, jobs } from "../src/data/mockData";

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "target",
    title: "Pencocokan CV otomatis",
    text: "Unggah satu CV, AI langsung menghitung kecocokan dengan semua lowongan terbuka.",
  },
  {
    icon: "eyeOff",
    title: "Blind screening",
    text: "Nama dan data pribadi disamarkan sampai kandidat di-shortlist. Penilaian murni soal kompetensi.",
  },
  {
    icon: "shield",
    title: "Perusahaan terverifikasi",
    text: "Setiap lowongan dipindai AI untuk mendeteksi indikasi penipuan sebelum tampil di publik.",
  },
];

const steps = [
  {
    title: "Unggah CV",
    text: "Satu file PDF. Data pribadi otomatis disamarkan saat penilaian.",
  },
  {
    title: "AI menganalisis",
    text: "CV dicocokkan secara semantik dengan semua lowongan, lengkap dengan saran perbaikan.",
  },
  {
    title: "Lamar satu klik",
    text: "Pilih lowongan dengan skor tertinggi dan lamar tanpa mengisi ulang data.",
  },
];

const preview = [
  { name: "Kandidat #042", note: "3 tahun REST API Laravel", score: 92 },
  { name: "Kandidat #104", note: "Autentikasi JWT, modul pembayaran", score: 85 },
  { name: "Kandidat #017", note: "Dasar PHP dan MySQL, magang 8 bulan", score: 71 },
  { name: "Kandidat #063", note: "Proyek pribadi Node.js", score: 54 },
];

export default function HomePage() {
  const openJobs = jobs.filter((j) => j.status === "open");
  const verifiedCompanies = new Set(
    openJobs.filter((j) => getUser(j.hrd_id)?.is_verified).map((j) => j.hrd_id)
  ).size;

  const stats = [
    { value: String(openJobs.length), label: "Lowongan terbuka" },
    { value: String(verifiedCompanies), label: "Perusahaan terverifikasi" },
    { value: "4", label: "Tahap analisis AI per CV" },
    { value: "1 klik", label: "Untuk melamar" },
  ];

  return (
    <>
      {/* HERO DASHBOARD PUBLIK */}
      <section className="relative overflow-hidden bg-brand-600 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-400/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em]">
                <Icon name="sparkles" className="h-3.5 w-3.5 text-accent-400" />
                Dashboard Publik (Tanpa Login)
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-400 px-3 py-1 text-xs font-extrabold text-ink-950">
                Fitur HRD &amp; Pelamar
              </span>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              Kerja yang{" "}
              <span className="box-decoration-clone bg-accent-400 px-2 text-ink-950">
                cocok
              </span>
              , bukan sekadar lowongan.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100 md:text-lg">
              Eksplorasi lowongan pekerjaan langsung di dashboard publik tanpa perlu login. Masuk sebagai Pelamar untuk mulai mencocokkan CV dan melamar, atau masuk sebagai HRD untuk mengelola rekrutmen.
            </p>

            <div className="mt-8 max-w-xl">
              <HeroSearch />
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-brand-200">Aksi cepat:</span>
                <Link
                  href="/login?role=candidate&from=apply"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-semibold text-white hover:bg-white/20 transition"
                >
                  <Icon name="sparkles" className="h-3 w-3 text-accent-400" />
                  Cek Kecocokan CV (AI Matchmaker)
                </Link>
                <Link
                  href="#lowongan"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-semibold text-white hover:bg-white/20 transition"
                >
                  <Icon name="briefcase" className="h-3 w-3 text-accent-400" />
                  Lamar Lowongan Terbuka
                </Link>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-brand-100">
              <span className="inline-flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-accent-400" strokeWidth={2.5} />
                Blind screening
              </span>
              <span className="inline-flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-accent-400" strokeWidth={2.5} />
                Anti-penipuan lowongan
              </span>
              <span className="inline-flex items-center gap-2">
                <Icon name="check" className="h-4 w-4 text-accent-400" strokeWidth={2.5} />
                Lamar satu klik
              </span>
            </div>
          </div>

          {/* Pratinjau produk */}
          <div className="relative lg:rotate-1">
            <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl bg-accent-400" />
            <div className="relative rounded-2xl border-2 border-ink-900 bg-white p-5 text-ink-900">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Peringkat kandidat
                  </p>
                  <p className="font-bold">Backend Developer (Laravel)</p>
                </div>
                <span className="chip">
                  <Icon name="eyeOff" className="h-3.5 w-3.5" />
                  Blind aktif
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {preview.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-canvas px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="w-4 text-center text-sm font-extrabold text-slate-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{p.name}</p>
                        <p className="truncate text-xs text-slate-500">{p.note}</p>
                      </div>
                    </div>
                    <ScoreBadge score={p.score} showLabel={false} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRIP STATISTIK */}
      <section className="border-y-2 border-ink-900 bg-accent-400 text-ink-950">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-6 px-4 py-8 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`px-4 ${i > 0 ? "md:border-l-2 md:border-ink-900/20" : ""}`}
            >
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                {s.value}
              </p>
              <p className="mt-1 text-sm font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DUA FITUR UTAMA: PELAMAR & HRD */}
      <section id="dua-fitur" className="bg-canvas border-b-2 border-slate-200 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <span className="eyebrow">Dua Fitur Utama</span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900 md:text-4xl">
              Pilih Akses Fitur Sesuai Kebutuhan Anda
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-slate-600">
              RanahTalenta memfasilitasi dua sisi proses rekrutmen: pencari kerja (Pelamar) yang ingin mencocokkan CV, dan perusahaan (HRD) yang ingin menyaring kandidat terbaik.
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-2">
            {/* KARTU FITUR PELAMAR */}
            <div className="card-bold lift flex flex-col justify-between p-7 border-l-8 border-l-brand-600">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon name="user" className="h-6 w-6" />
                  </span>
                  <span className="chip font-bold text-brand-700 bg-brand-50">
                    Untuk Pencari Kerja
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-ink-900">Fitur Pelamar</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Cari lowongan langsung di dashboard publik tanpa login. Saat ingin melamar pekerjaan yang cocok, masuk sebagai Pelamar untuk memanfaatkan analisis AI:
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>Smart CV Uploader:</b> Ekstraksi otomatis dari satu file PDF.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>Pencocokan Semantik:</b> Skor kecocokan AI untuk semua lowongan terbuka.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>AI Resume Feedback:</b> Masukan kekuatan dan celah kompetensi Anda.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>1-Klik Melamar:</b> Melamar langsung tanpa mengisi formulir berulang.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <Link
                  href="/login?role=candidate"
                  className="btn-primary btn-hard flex-1 text-center"
                >
                  Masuk sebagai Pelamar
                  <Icon name="arrowRight" className="h-4 w-4 inline ml-1.5" />
                </Link>
                <Link
                  href="/register?role=candidate"
                  className="btn-outline flex-1 text-center"
                >
                  Daftar Pelamar
                </Link>
              </div>
            </div>

            {/* KARTU FITUR HRD */}
            <div className="card-bold lift flex flex-col justify-between p-7 border-l-8 border-l-accent-400">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon name="building" className="h-6 w-6" />
                  </span>
                  <span className="chip font-bold text-amber-900 bg-amber-50">
                    Untuk Perusahaan / HRD
                  </span>
                </div>
                <h3 className="mt-5 text-2xl font-bold text-ink-900">Fitur HRD (Perusahaan)</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Kelola lowongan pekerjaan dan terima kandidat terbaik dengan pemeringkatan objektif bebas bias berbasis AI:
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>Posting Lowongan:</b> Dilengkapi verifikasi legalitas dan anti-penipuan AI.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>Blind Screening:</b> Nama dan kontak kandidat disamarkan sampai di-shortlist.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>AI Candidate Ranking:</b> Peringkat otomatis (Highly Recommended, Potential, Not Recommended).</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 text-emerald-600 shrink-0" strokeWidth={2.5} />
                    <span><b>Explainable AI &amp; Pertanyaan:</b> 3 rekomendasi pertanyaan wawancara per kandidat.</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                <Link
                  href="/login?role=hrd"
                  className="btn-primary btn-hard flex-1 text-center !bg-ink-900 hover:!bg-ink-950"
                >
                  Masuk sebagai HRD
                  <Icon name="arrowRight" className="h-4 w-4 inline ml-1.5" />
                </Link>
                <Link
                  href="/register?role=hrd"
                  className="btn-outline flex-1 text-center"
                >
                  Daftar Perusahaan (HRD)
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DAFTAR LOWONGAN (DASHBOARD PUBLIK) */}
      <Suspense fallback={null}>
        <JobBoard />
      </Suspense>

      {/* FITUR */}
      <section id="fitur" className="scroll-mt-24 bg-white border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="eyebrow">Mengapa RanahTalenta</p>
          <h2 className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-ink-900 md:text-5xl">
            Seleksi yang adil, transparan, dan cepat.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="card-bold lift p-6">
                <div className="flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
                    <Icon name={f.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-4xl font-extrabold text-brand-100">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CARA KERJA */}
      <section id="cara-kerja" className="scroll-mt-24 bg-ink-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent-400">
            Cara kerja
          </p>
          <h2 className="mt-2 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Tiga langkah menuju pekerjaan yang pas.
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.title}
                className="rounded-2xl border-2 border-white/15 bg-white/5 p-6"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-400 text-xl font-extrabold text-ink-950">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 bg-canvas">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border-2 border-ink-900 bg-brand-600 p-10 text-white shadow-[6px_6px_0_0_var(--color-ink-900)] md:p-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent-400/30 blur-3xl" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="max-w-xl text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">
                Siap menemukan pekerjaan yang benar-benar cocok?
              </h2>
              <p className="mt-3 text-brand-100">
                Pilih peran Anda dan mulai sekarang secara gratis.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link href="/register?role=candidate" className="btn-primary btn-hard btn-lg">
                Daftar Pelamar
                <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <Link href="/login" className="btn-ghost-light btn-lg">
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
