"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold ${
          light ? "bg-accent-400 text-ink-950" : "bg-brand-600 text-accent-400"
        }`}
      >
        H
      </span>
      <span
        className={`text-[17px] font-bold tracking-tight ${
          light ? "text-white" : "text-ink-900"
        }`}
      >
        HireMatch<span className={light ? "text-accent-400" : "text-brand-600"}> AI</span>
      </span>
    </span>
  );
}

const LINKS = [
  { href: "/", label: "Lowongan" },
  { href: "/#fitur", label: "Fitur" },
  { href: "/#cara-kerja", label: "Cara kerja" },
];

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition ${
      pathname === href
        ? "bg-accent-400 text-ink-950"
        : "text-ink-900 hover:bg-brand-50 hover:text-brand-700"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b-2 border-ink-900 bg-white">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-10">
          <Link href="/" aria-label="Beranda HireMatch AI">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/login" className="btn-outline btn-sm">
            Masuk
          </Link>
          <Link href="/register" className="btn-primary btn-hard btn-sm">
            Daftar
          </Link>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-slate-200 px-4 py-2 md:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={linkClass(l.href)}>
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}