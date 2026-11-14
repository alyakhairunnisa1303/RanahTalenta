"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
      <div className="mx-auto flex h-[80px] max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-10">
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
            className="inline-flex items-center justify-center rounded-xl border-2 border-ink-900 bg-white px-6 py-2.5 text-lg font-black text-ink-950 shadow-[2px_2px_0_0_var(--color-ink-900)] transition hover:bg-slate-100"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="btn-primary btn-hard px-6 py-2.5 text-lg font-black shadow-[2px_2px_0_0_var(--color-ink-900)]"
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
