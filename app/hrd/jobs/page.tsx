"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Plus, Search } from "lucide-react";
import { useAllJobs } from "../../../src/lib/use-all-jobs";
import { useCurrentUser } from "../../../src/lib/use-current-user";

type Filter = "all" | "open" | "closed";

export default function HrdJobsPage() {
  const jobs = useAllJobs();
  const { user } = useCurrentUser();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const mine = useMemo(() => jobs.filter((job) => job.hrd_id === user?.id), [jobs, user?.id]);
  const visible = mine.filter((job) =>
    (filter === "all" || job.status === filter) &&
    `${job.title} ${job.location}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Rekrutmen</p>
          <h1 className="mt-2 text-2xl font-bold text-ink-900">Kelola Lowongan</h1>
          <p className="mt-1 text-sm text-slate-500">Pantau status lowongan dan buka hasil screening kandidat.</p>
        </div>
        <Link href="/hrd/jobs/new" className="btn-primary inline-flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Buat lowongan
        </Link>
      </header>

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2" aria-label="Filter lowongan">
            {(["all", "open", "closed"] as const).map((value) => (
              <button key={value} onClick={() => setFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === value ? "bg-ink-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {value === "all" ? `Semua (${mine.length})` : value === "open" ? `Aktif (${mine.filter((job) => job.status === "open").length})` : `Ditutup (${mine.filter((job) => job.status === "closed").length})`}
              </button>
            ))}
          </div>
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari posisi atau lokasi" />
          </label>
        </div>
        {visible.length ? (
          <ul className="divide-y divide-slate-100">
            {visible.map((job) => (
              <li key={job.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Briefcase className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <Link href={`/hrd/jobs/${job.id}`} className="font-semibold text-ink-900 hover:text-brand-700">{job.title}</Link>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{job.location} <span aria-hidden="true">·</span> {job.created_at}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${job.status === "open" ? "bg-emerald-50 text-emerald-700" : job.status === "flagged" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                    {job.status === "open" ? "Aktif" : job.status === "flagged" ? "Ditinjau" : "Ditutup"}
                  </span>
                  <Link href={`/hrd/jobs/${job.id}`} className="text-sm font-semibold text-brand-700 hover:underline">Lihat kandidat</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-14 text-center text-sm text-slate-500">{mine.length ? "Tidak ada lowongan yang cocok dengan filter." : "Anda belum memiliki lowongan. Buat lowongan pertama untuk mulai menerima kandidat."}</div>
        )}
      </section>
    </div>
  );
}
