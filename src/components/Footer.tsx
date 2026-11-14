import Link from "next/link";
import { Logo } from "./Navbar";

export default function Footer() {
  return (
    <footer className="border-t-2 border-ink-900 bg-ink-950 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
            Rekrutmen cerdas, adil, dan transparan dengan bantuan AI.
          </p>
          <Link href="/register" className="btn-primary btn-hard btn-sm mt-6">
            Daftar gratis
          </Link>
        </div>

        <div className="space-y-2.5 text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent-400">
            Pelamar
          </p>
          <Link href="/#lowongan" className="block hover:text-white">
            Cari lowongan
          </Link>
          <Link href="/register" className="block hover:text-white">
            Buat akun
          </Link>
          <Link href="/login" className="block hover:text-white">
            Masuk
          </Link>
        </div>

        <div className="space-y-2.5 text-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-accent-400">
            Perusahaan
          </p>
          <Link href="/register" className="block hover:text-white">
            Daftar sebagai HRD
          </Link>
          <Link href="/#fitur" className="block hover:text-white">
            Fitur
          </Link>
          <Link href="/#cara-kerja" className="block hover:text-white">
            Cara kerja
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-slate-500">
        © 2026 HireMatch AI. Hak cipta dilindungi.
      </div>
    </footer>
  );
}