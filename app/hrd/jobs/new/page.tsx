"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "../../../../src/components/Icons";
import { CURRENT_HRD_ID, getUser } from "../../../../src/data/mockData";
import { addCustomJob, nextJobId } from "../../../../src/lib/local-store";
import { checkJob } from "../../../../src/lib/screen-client";
import type { ScamCheckResult } from "../../../../src/types/contract";

// CATATAN: "Bobot Penilaian" BELUM ada di schema.sql (tabel jobs).
// Backend perlu menambah kolom (mis. scoring_weights JSON) atau bagian ini dihapus.
type Weights = {
  hardSkill: number;
  experience: number;
  education: number;
};

const CRITERIA: [keyof Weights, string][] = [
  ["hardSkill", "Hard Skill"],
  ["experience", "Pengalaman Kerja"],
  ["education", "Pendidikan"],
];

type Phase = "form" | "checking" | "safe" | "flagged";

export default function NewJobPage() {
  const [weights, setWeights] = useState<Weights>({
    hardSkill: 60,
    experience: 30,
    education: 10,
  });
  const [phase, setPhase] = useState<Phase>("form");
  const [checkResult, setCheckResult] = useState<ScamCheckResult | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [checkError, setCheckError] = useState("");
  const [createdJobId, setCreatedJobId] = useState<number | null>(null);
  const total = Object.values(weights).reduce((a, b) => a + b, 0);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (total !== 100) return;

    const data = new FormData(e.currentTarget);
    const title = String(data.get("title") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const requirements = String(data.get("requirements") ?? "").trim();
    const location = String(data.get("location") ?? "").trim();
    const salary = String(data.get("salary_range") ?? "").trim();
    const hrd = getUser(CURRENT_HRD_ID);

    setPhase("checking");
    setCheckError("");

    if (!hrd?.company_name || !hrd.email) {
      setCheckError("Data perusahaan HRD tidak ditemukan.");
      setPhase("form");
      return;
    }

    try {
      const response = await checkJob(
        hrd.company_name,
        hrd.email,
        title,
        `${description}\n\nKualifikasi:\n${requirements}`
      );
      setCheckResult(response.result);
      setDecision(response.decision);

      if (response.decision !== "open") {
        setPhase("flagged");
        return;
      }

      const id = nextJobId();
      addCustomJob({
        id,
        hrd_id: CURRENT_HRD_ID,
        title,
        description,
        requirements,
        location,
        salary_range: salary || null,
        status: "open",
        created_at: new Date().toISOString().slice(0, 10),
      });
      setCreatedJobId(id);
      setPhase("safe");
    } catch (err: unknown) {
      setCheckError(
        err instanceof Error ? err.message : "Gagal memeriksa lowongan."
      );
      setPhase("form");
    }
  }

  if (phase !== "form") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card w-full max-w-md p-8 text-center">
          {phase === "checking" && (
            <>
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-sky-500 text-white shadow-lg shadow-brand-600/30">
                <Icon name="shield" className="h-8 w-8" />
                <span className="absolute inset-x-0 h-4 animate-scan bg-gradient-to-b from-transparent via-white/60 to-transparent" />
              </span>
              <h1 className="mt-5 text-xl font-bold text-ink-900">AI Job Scam Check</h1>
              <p className="mt-2 animate-pulse text-sm text-slate-500">
                Memeriksa indikasi penipuan pada deskripsi lowongan…
              </p>
            </>
          )}
          {phase === "safe" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h1 className="mt-5 text-xl font-bold text-ink-900">Lowongan aman &amp; terbit</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {checkResult?.reason ??
                  "Tidak ditemukan indikasi penipuan."}{" "}
                Lowongan kini tampil di halaman depan publik.
              </p>
              {checkResult && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  Risiko: {checkResult.risk_level} · Keyakinan {checkResult.confidence}%
                </p>
              )}
              <div className="mt-6 flex flex-col gap-2">
                {createdJobId && (
                  <Link href={`/hrd/jobs/${createdJobId}`} className="btn-outline w-full">
                    Lihat lowongan &amp; kandidat
                  </Link>
                )}
                <Link href="/hrd/dashboard" className="btn-primary w-full">
                  Kembali ke dashboard
                </Link>
              </div>
            </>
          )}
          {phase === "flagged" && (
            <>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icon name="ban" className="h-7 w-7" />
              </span>
              <h1 className="mt-5 text-xl font-bold text-ink-900">
                {decision === "pending_review"
                  ? "Perlu tinjauan manual"
                  : "Lowongan ditandai (flagged)"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                {checkResult?.reason ??
                  "AI mendeteksi indikasi penipuan pada lowongan ini."}{" "}
                Lowongan tidak diterbitkan. Perbaiki deskripsinya lalu kirim ulang.
              </p>
              {checkResult && (
                <>
                  <p className="mt-2 text-xs font-semibold text-red-700">
                    Risiko: {checkResult.risk_level} · Keyakinan {checkResult.confidence}%
                  </p>
                  {checkResult.signals.length > 0 && (
                    <ul className="mt-3 space-y-1 text-left text-xs text-red-700">
                      {checkResult.signals.map((signal) => (
                        <li key={signal} className="flex gap-1.5">
                          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          {signal}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              <button onClick={() => setPhase("form")} className="btn-primary mt-6 w-full">
                Perbaiki lowongan
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      <Link
        href="/hrd/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900">
        Buat lowongan baru
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Lowongan akan diperiksa AI sebelum tampil di halaman publik.
      </p>

      {checkError && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <Icon name="alert" className="h-4 w-4 shrink-0" />
          {checkError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card space-y-5 p-6">
          <div>
            <label className="label">Judul posisi</label>
            <input
              name="title"
              required
              className="input"
              placeholder="mis. Backend Developer"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Lokasi</label>
              <input
                name="location"
                required
                className="input"
                placeholder="Jakarta / Remote"
              />
            </div>
            <div>
              <label className="label">Kisaran gaji (opsional)</label>
              <input name="salary_range" className="input" placeholder="Rp 8–12 jt" />
            </div>
          </div>
          <div>
            <label className="label">Deskripsi pekerjaan</label>
            <textarea name="description" required rows={5} className="input" />
          </div>
          <div>
            <label className="label">Kualifikasi</label>
            <textarea
              name="requirements"
              required
              rows={5}
              className="input"
              placeholder="Satu kualifikasi per baris"
            />
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink-900">Bobot penilaian</h2>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                  total === 100
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {total}%
              </span>
            </div>
            <div className="mt-4 space-y-5">
              {CRITERIA.map(([key, label]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold tabular-nums text-ink-900">
                      {weights[key]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={weights[key]}
                    onChange={(e) =>
                      setWeights({ ...weights, [key]: Number(e.target.value) })
                    }
                    className="mt-2 w-full accent-brand-600"
                  />
                </div>
              ))}
            </div>
            {total !== 100 && (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-red-600">
                <Icon name="alert" className="h-3.5 w-3.5" />
                Total bobot harus tepat 100%.
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary btn-lg w-full" disabled={total !== 100}>
            Terbitkan lowongan
          </button>
        </aside>
      </form>
    </div>
  );
}