"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  Bell,
  Briefcase,
  CalendarCheck,
  FileCheck,
  LayoutDashboard,
  Plus,
  Sparkles,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Icon from "./Icons";
import { Logo } from "./Navbar";
import { PulseDot } from "./AiUi";
import type { UserRole } from "../types/hirematch";
import { useCurrentUser } from "../lib/use-current-user";
import { useAllJobs } from "../lib/use-all-jobs";
import { useAllApplications } from "../lib/use-all-applications";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };
type NavGroup = { label: string; items: NavItem[] };
type NotificationItem = { id: string; title: string; message: string; time: string; href: string };

const NOTIFICATIONS: Record<UserRole, NotificationItem[]> = {
  candidate: [
    { id: "candidate-interview", title: "Panggilan Wawancara", message: "Selamat! Nusantara Digital mengundang Anda untuk wawancara posisi UI/UX Designer.", time: "10 menit lalu", href: "/candidate/interviews" },
    { id: "candidate-cv", title: "Analisis AI Selesai", message: "CV Anda telah selesai diproses oleh AI Engine. Cek rekomendasi perbaikan profil Anda.", time: "2 jam lalu", href: "/candidate/cv-profile" },
    { id: "candidate-application", title: "Lamaran Terkirim", message: "Lamaran Anda berhasil dikirim. Pantau status terbaru pada halaman Lamaran Saya.", time: "1 hari lalu", href: "/candidate/applications" },
  ],
  hrd: [
    { id: "hrd-applicant", title: "Pelamar Baru Masuk", message: "Ada kandidat baru yang melamar. Tinjau hasil screening AI di Talent Pool.", time: "5 menit lalu", href: "/hrd/candidates" },
    { id: "hrd-interview", title: "Jadwal Interview", message: "Periksa jadwal interview kandidat shortlist Anda yang akan datang.", time: "1 jam lalu", href: "/hrd/interviews" },
    { id: "hrd-screening", title: "Screening AI Selesai", message: "Hasil pemeringkatan kandidat untuk lowongan Anda siap ditinjau.", time: "3 jam lalu", href: "/hrd/candidates" },
  ],
};

const CANDIDATE_NAV: NavGroup[] = [
  { label: "Karir & Lamaran", items: [
    { href: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/candidate/jobs", label: "Cari Lowongan", icon: Briefcase },
    { href: "/candidate/applications", label: "Lamaran Saya", icon: FileCheck },
    { href: "/candidate/interviews", label: "Jadwal Wawancara", icon: CalendarCheck },
  ] },
  { label: "Profil & AI", items: [
    { href: "/candidate/cv-profile", label: "CV & Analisis AI", icon: Sparkles },
    { href: "/candidate/profile", label: "Profil & Portofolio", icon: UserCog },
  ] },
];

const HRD_NAV: NavGroup[] = [
  {
    label: "Rekrutmen",
    items: [
      { href: "/hrd/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/hrd/jobs", label: "Kelola Lowongan", icon: Briefcase },
      { href: "/hrd/candidates", label: "Kandidat / Talent Pool", icon: Users },
      { href: "/hrd/interviews", label: "Jadwal Interview", icon: CalendarCheck },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { href: "/hrd/ai-settings", label: "Konfigurasi AI", icon: SlidersHorizontal },
      { href: "/hrd/company-profile", label: "Profil Perusahaan", icon: Building2 },
    ],
  },
];

function titleFor(pathname: string) {
  if (pathname === "/candidate/dashboard") return "Dashboard Pelamar";
  if (pathname === "/candidate/applications") return "Lamaran Saya";
  if (pathname === "/candidate/interviews") return "Jadwal Wawancara";
  if (pathname === "/candidate/cv-profile") return "CV dan Analisis AI";
  if (pathname === "/candidate/profile") return "Profil & Portofolio";
  if (pathname === "/candidate/jobs") return "Cari Lowongan";
  if (pathname.startsWith("/candidate/jobs/")) return "Detail Lowongan";
  if (pathname === "/hrd/dashboard") return "Dashboard HRD";
  if (pathname === "/hrd/jobs") return "Kelola Lowongan";
  if (pathname === "/hrd/candidates") return "Talent Pool";
  if (pathname === "/hrd/interviews") return "Jadwal Interview";
  if (pathname === "/hrd/ai-settings") return "Konfigurasi AI";
  if (pathname === "/hrd/company-profile") return "Profil Perusahaan";
  if (pathname === "/hrd/jobs/new") return "Buat Lowongan";
  if (pathname.startsWith("/hrd/jobs/")) return "Peringkat Kandidat";
  return "";
}

function DashboardShellInner({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const userId = user?.id;
  const allJobs = useAllJobs();
  const allApplications = useAllApplications();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    role === "candidate" ? ["candidate-application"] : ["hrd-screening"],
  );
  const [hasScheduledInterview, setHasScheduledInterview] = useState(false);
  const notificationAreaRef = useRef<HTMLDivElement>(null);
  const notificationStorageKey = `ranah-talenta:notifications:${role}:${user?.id ?? "guest"}`;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(notificationStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as unknown;
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
          Promise.resolve().then(() => setReadNotificationIds(parsed));
        }
      }
    } catch {
      // Notifikasi contoh tetap berfungsi jika penyimpanan browser tidak tersedia.
    }
  }, [notificationStorageKey]);

  function saveReadNotifications(ids: string[]) {
    setReadNotificationIds(ids);
    try {
      window.localStorage.setItem(notificationStorageKey, JSON.stringify(ids));
    } catch {
      // Status dibaca tetap berlaku selama sesi halaman ini.
    }
  }

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!notificationAreaRef.current?.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [notificationsOpen]);

  useEffect(() => {
    if (!loading && (!user || user.role !== role)) {
      router.replace(`/login?role=${role}`);
    }
  }, [loading, role, router, user]);

  useEffect(() => {
    if (role !== "candidate" || !userId) return;
    let cancelled = false;
    fetch("/api/candidate/interviews", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json() as { interviews?: { status: string }[] };
        return data.interviews ?? [];
      })
      .then((items) => {
        if (!cancelled) setHasScheduledInterview(items.some((item) => item.status === "scheduled"));
      })
      .catch(() => { if (!cancelled) setHasScheduledInterview(false); });
    return () => { cancelled = true; };
  }, [role, userId]);

  if (loading || !user || user.role !== role) {
    return <div className="min-h-screen bg-canvas p-8 text-center text-slate-500">Memeriksa sesi akun...</div>;
  }

  const displayName = role === "hrd" ? user?.company_name : user?.name;
  const notifications = NOTIFICATIONS[role];
  const unreadCount = notifications.filter((item) => !readNotificationIds.includes(item.id)).length;
  const activeJobsCount = allJobs.filter(
    (job) => job.status === "open" && (role !== "hrd" || job.hrd_id === user?.id),
  ).length;
  const navGroups = role === "hrd" ? HRD_NAV : CANDIDATE_NAV;
  const candidateApplications = allApplications.filter((application) => application.candidate_id === user.id);
  const unreadCandidateInterviews = hasScheduledInterview && !readNotificationIds.includes("candidate-interview") ? 1 : 0;

  const isActive = (href: string) => {
    if (href === "/candidate/applications") return pathname === href;
    if (href === "/candidate/jobs")
      return pathname === href || pathname.startsWith("/candidate/jobs/");
    if (href === "/hrd/dashboard") return pathname === href;
    if (href === "/hrd/jobs")
      return pathname === href || (pathname.startsWith("/hrd/jobs/") && pathname !== "/hrd/jobs/new");
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
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0F172A] text-slate-300">
          <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 animate-float rounded-full bg-brand-600/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-16 h-56 w-56 animate-float rounded-full bg-accent-400/15 blur-3xl [animation-delay:-4s]" />

          <div className="relative flex h-16 shrink-0 items-center px-5">
            <Link href="/" aria-label="Beranda">
              <Logo light />
            </Link>
          </div>

          {role === "hrd" && (
            <div className="relative shrink-0 px-3 pb-3 pt-2">
              <Link
                href="/hrd/jobs/new"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent-400 px-3 py-3 text-sm font-bold text-[#0F172A] shadow-lg shadow-amber-950/20 transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]"
              >
                <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
                Buat lowongan
              </Link>
            </div>
          )}

          <nav aria-label="Navigasi dashboard" className="relative mt-1 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 pb-4">
            {navGroups.map((group) => (
              <section key={group.label} aria-label={group.label}>
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const ItemIcon = item.icon;
                    const badge = item.href === "/hrd/jobs" ? activeJobsCount
                      : item.href === "/candidate/applications" ? candidateApplications.filter((application) => application.status !== "rejected").length
                      : item.href === "/candidate/interviews" ? unreadCandidateInterviews
                      : item.badge;
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                          active
                            ? "bg-blue-500/15 text-white ring-1 ring-blue-400/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <ItemIcon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-accent-400" : "text-slate-400"}`} strokeWidth={1.9} />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {typeof badge === "number" && badge > 0 && (
                          <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums ${item.href === "/candidate/interviews" ? "bg-amber-400 text-amber-950" : active ? "bg-blue-400/20 text-blue-100" : "bg-white/10 text-slate-300"}`}>
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </nav>

          <div className="relative shrink-0 space-y-3 border-t border-white/5 bg-[#0F172A] p-3">
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
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.replace("/login");
                }}
                aria-label="Keluar"
                title="Keluar"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <Icon name="logout" className="h-4 w-4" />
              </button>
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
        <div className="flex items-center gap-2">
          <div ref={notificationAreaRef} className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((value) => !value)}
              aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`}
              aria-expanded={notificationsOpen}
              aria-controls="dashboard-notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Bell className="h-5 w-5" strokeWidth={1.9} />
              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <section
                id="dashboard-notifications"
                role="dialog"
                aria-label="Notifikasi"
                className="absolute right-0 top-full z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-xl shadow-slate-900/10"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900">Notifikasi</h2>
                    {unreadCount > 0 && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">{unreadCount} baru</span>}
                  </div>
                  <button
                    type="button"
                    disabled={unreadCount === 0}
                    onClick={() => saveReadNotifications(notifications.map((item) => item.id))}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 disabled:cursor-default disabled:text-slate-400"
                  >
                    Tandai semua dibaca
                  </button>
                </div>

                <ul className="max-h-[min(420px,65vh)] overflow-y-auto py-1">
                  {notifications.map((item) => {
                    const unread = !readNotificationIds.includes(item.id);
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => {
                            if (!readNotificationIds.includes(item.id)) {
                              saveReadNotifications([...readNotificationIds, item.id]);
                            }
                            setNotificationsOpen(false);
                          }}
                          className={`block border-b border-slate-100 px-4 py-3.5 transition last:border-b-0 hover:bg-slate-50 ${unread ? "bg-blue-50/70" : "bg-white"}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${unread ? "bg-blue-600" : "bg-transparent"}`} aria-hidden="true" />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-3">
                                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                                <span className="shrink-0 text-[11px] text-slate-400">{item.time}</span>
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-slate-600">{item.message}</span>
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="border-t border-slate-100 px-4 py-3 text-center">
                  <Link
                    href={role === "hrd" ? "/hrd/dashboard" : "/candidate/dashboard"}
                    onClick={() => setNotificationsOpen(false)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900"
                  >
                    Lihat semua aktivitas
                  </Link>
                </div>
              </section>
            )}
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
            <PulseDot />
            AI aktif
          </span>
        </div>
      </header>

      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(31,79,224,0.08),transparent)]" />
        <main className="relative">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardShell({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas p-6 text-center text-slate-400">
          Memuat dashboard...
        </div>
      }
    >
      <DashboardShellInner role={role}>{children}</DashboardShellInner>
    </Suspense>
  );
}
