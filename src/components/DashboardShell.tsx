"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icons";
import { Logo } from "./Navbar";
import { PulseDot } from "./AiUi";
import { CURRENT_CANDIDATE_ID, CURRENT_HRD_ID, getUser } from "../data/mockData";
import type { UserRole } from "../types/hirematch";

type NavItem = { href: string; label: string; icon: IconName };

const NAV: Record<UserRole, NavItem[]> = {
  candidate: [
    { href: "/candidate/dashboard", label: "Dashboard", icon: "layout" },
    { href: "/", label: "Cari lowongan", icon: "search" },
  ],
  hrd: [
    { href: "/hrd/dashboard", label: "Dashboard", icon: "layout" },
    { href: "/hrd/jobs/new", label: "Buat lowongan", icon: "plus" },
    { href: "/", label: "Halaman publik", icon: "briefcase" },
  ],
};

function titleFor(pathname: string) {
  if (pathname === "/candidate/dashboard") return "Dashboard Pelamar";
  if (pathname === "/hrd/dashboard") return "Dashboard HRD";
  if (pathname === "/hrd/jobs/new") return "Buat Lowongan";
  if (pathname.startsWith("/hrd/jobs/")) return "Peringkat Kandidat";
  return "";
}

export default function DashboardShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const user = getUser(role === "hrd" ? CURRENT_HRD_ID : CURRENT_CANDIDATE_ID);
  const displayName = role === "hrd" ? user?.company_name : user?.name;

  const isActive = (href: string) => {
    if (href === "/hrd/dashboard")
      return (
        pathname === href ||
        (pathname.startsWith("/hrd/jobs/") && pathname !== "/hrd/jobs/new")
      );
    return pathname === href;
  };

  return (
    <div className="min-h-screen bg-canvas lg:pl-64">
      {open && (
        <div
          className="fixed inset-0 z-40 animate-fade-in bg-slate-900/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative flex h-full flex-col overflow-hidden bg-ink-950 text-slate-300">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 animate-float rounded-full bg-brand-600/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 animate-float rounded-full bg-accent-400/15 blur-3xl [animation-delay:-4s]" />

          <div className="relative flex h-16 items-center px-5">
            <Link href="/" aria-label="Beranda">
              <Logo light />
            </Link>
          </div>

          <nav className="relative mt-4 flex-1 space-y-1 px-3">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Menu
            </p>
            {NAV[role].map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-white/10 text-white ring-1 ring-white/10"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon
                    name={item.icon}
                    className={`h-[18px] w-[18px] ${active ? "text-accent-400" : ""}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative space-y-3 p-3">
            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-brand-600/40 to-accent-400/15 p-4">
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon name="cpu" className="h-4 w-4" />
                </span>
                <PulseDot />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">AI Engine</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                Pencocokan semantik dan blind screening aktif.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-sky-500 text-sm font-bold text-white">
                {(displayName ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="text-xs text-slate-400">
                  {role === "hrd" ? "Akun HRD" : "Akun Pelamar"}
                </p>
              </div>
              <Link
                href="/"
                aria-label="Keluar"
                title="Keluar"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Icon name="logout" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-ink-900">{titleFor(pathname)}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
          <PulseDot />
          AI aktif
        </span>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(31,79,224,0.08),transparent)]" />
        <main className="relative">{children}</main>
      </div>
    </div>
  );
}