"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icons";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black shadow-sm ${
          light ? "bg-accent-400 text-ink-950" : "bg-brand-600 text-accent-400"
        }`}
      >
        R
      </span>
      <span
        className={`text-2xl font-black tracking-tight ${
          light ? "text-white" : "text-ink-900"
        }`}
      >
        Ranah<span className={light ? "text-accent-400" : "text-brand-600"}>Talenta</span>
      </span>
    </span>
  );
}

const LINKS = [
  { href: "/#lowongan", label: "Lowongan" },
  { href: "/#cara-kerja", label: "Cara kerja" },
];

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `whitespace-nowrap rounded-xl px-4 py-2 text-lg font-black tracking-tight transition ${
      pathname === href
        ? "bg-accent-400 text-ink-950"
        : "text-ink-900 hover:bg-brand-50 hover:text-brand-700"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink-900 bg-white">
      <div className={`mx-auto flex h-[80px] items-center justify-between px-4 ${pathname === "/login" || pathname === "/register" ? "max-w-7xl gap-2 sm:gap-3" : "max-w-6xl gap-4"}`}>
        <div className={`flex min-w-0 items-center ${pathname === "/login" || pathname === "/register" ? "gap-3 sm:gap-4" : "gap-4 sm:gap-8"}`}>
          {(pathname === "/login" || pathname === "/register") && (
            <Link
              href="/"
              aria-label="Kembali ke halaman utama"
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:text-sm md:-translate-x-[max(0px,calc((100vw-80rem)/2))]"
            >
              <Icon name="arrowLeft" className="h-4 w-4" />
              <span className="hidden sm:inline">{pathname === "/register" ? "Kembali" : "Kembali"}</span>
            </Link>
          )}
          <Link href="/" aria-label="Beranda RanahTalenta">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
              className={`inline-flex items-center justify-center rounded-xl border-2 border-ink-900 bg-white py-2 text-xs font-black text-ink-950 shadow-[2px_2px_0_0_var(--color-ink-900)] transition hover:bg-slate-100 sm:py-2.5 sm:text-base ${pathname === "/login" || pathname === "/register" ? "px-2 sm:px-4 lg:px-6 lg:text-lg" : "px-6 text-lg"}`}
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className={`btn-primary btn-hard py-2 text-xs font-black shadow-[2px_2px_0_0_var(--color-ink-900)] sm:py-2.5 sm:text-base ${pathname === "/login" || pathname === "/register" ? "px-2 sm:px-4 lg:px-6 lg:text-lg" : "px-6 text-lg"}`}
          >
            Daftar
          </Link>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-t border-slate-200 px-4 py-2.5 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(l.href)}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
