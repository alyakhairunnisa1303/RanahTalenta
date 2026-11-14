"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import JobCard from "./JobCard";
import Icon from "./Icons";
import { jobs, getUser } from "../data/mockData";

const ALL_LOCATIONS = "Semua Lokasi";

export default function JobBoard() {
  const params = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);
  const [location, setLocation] = useState(ALL_LOCATIONS);

  // Sinkron saat parameter URL q berubah dari pencarian hero
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  // Hanya lowongan berstatus open yang tampil di publik
  const openJobs = useMemo(() => jobs.filter((j) => j.status === "open"), []);
  const locations = useMemo(
    () => [ALL_LOCATIONS, ...Array.from(new Set(openJobs.map((j) => j.location)))],
    [openJobs]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return openJobs.filter((job) => {
      const company = getUser(job.hrd_id)?.company_name ?? "";
      const matchQuery =
        !q ||
        job.title.toLowerCase().includes(q) ||
        company.toLowerCase().includes(q) ||
        job.description.toLowerCase().includes(q) ||
        job.requirements.toLowerCase().includes(q);
      const matchLocation = location === ALL_LOCATIONS || job.location === location;
      return matchQuery && matchLocation;
    });
  }, [openJobs, query, location]);

  return (
    <section id="lowongan" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="eyebrow">Dashboard Publik</span>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900 md:text-4xl">
            Daftar Lowongan Pekerjaan
          </h2>
          <p className="mt-2 max-w-xl text-sm text-slate-600">
            Telusuri lowongan kerja aktif tanpa perlu login. Tekan salah satu pekerjaan untuk masuk ke fitur Pelamar dan mulai melamar dengan bantuan AI.
          </p>
        </div>
        <p className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-ink-900 bg-accent-400 px-4 py-1.5 text-sm font-bold text-ink-950">
          <Icon name="briefcase" className="h-4 w-4" />
          {filtered.length} lowongan tersedia
        </p>
      </div>

      <div className="card-bold mt-8 flex flex-col gap-3 p-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <input
            className="input pl-10"
            placeholder="Cari posisi, perusahaan, atau skill..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="relative sm:w-56">
          <Icon
            name="pin"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          />
          <select
            className="input pl-10"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            {locations.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card-bold mt-8 px-6 py-16 text-center">
          <Icon name="search" className="mx-auto h-9 w-9 text-brand-200" />
          <p className="mt-3 text-lg font-bold text-ink-900">
            Tidak ada lowongan yang cocok
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Coba ubah kata kunci atau lokasi pencarian.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </section>
  );
}
