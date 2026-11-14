"use client";

import { useState } from "react";
import { ExternalLink, Link2, ShieldCheck, UserRound } from "lucide-react";
import { useCurrentUser } from "../../../src/lib/use-current-user";

export default function CandidateProfilePage() {
  const { user, refresh } = useCurrentUser();
  const [portfolioUrl, setPortfolioUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const currentPortfolioUrl = portfolioUrl ?? user?.portfolio_url ?? "";

  async function savePortfolio(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/candidate/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio_url: currentPortfolioUrl }),
      });
      const data = await response.json() as { error?: string; user?: { portfolio_url: string | null } };
      if (!response.ok) throw new Error(data.error ?? "Tautan portofolio gagal disimpan.");
      setPortfolioUrl(data.user?.portfolio_url ?? "");
      await refresh();
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tautan portofolio gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
    <header><p className="eyebrow">Profil Pelamar</p><h1 className="mt-2 text-2xl font-bold text-ink-900">Profil & Portofolio</h1><p className="mt-1 text-sm text-slate-500">Informasi identitas dan tautan portofolio Anda.</p></header>
    <section className="card p-6">
      <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><UserRound className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink-900">Identitas akun</h2><p className="text-sm text-slate-500">Data akun pelamar yang sedang digunakan.</p></div></div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2"><div><dt className="label">Nama</dt><dd className="mt-1 text-sm font-medium text-ink-900">{user?.name ?? "Memuat…"}</dd></div><div><dt className="label">Email</dt><dd className="mt-1 text-sm font-medium text-ink-900">{user?.email ?? "—"}</dd></div></dl>
    </section>
    <section className="rounded-xl border border-sky-200 bg-sky-50 p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" /><div><h2 className="font-semibold text-sky-900">Privasi saat blind screening</h2><p className="mt-1 text-sm leading-relaxed text-sky-800">Data pribadi disamarkan selama proses screening AI. Identitas ditampilkan kepada HRD setelah Anda masuk tahap shortlist.</p></div></div></section>
    <section className="card p-6"><div className="flex items-center gap-3"><Link2 className="h-5 w-5 text-brand-600" /><h2 className="font-semibold text-ink-900">Link portofolio</h2></div><p className="mt-2 text-sm text-slate-500">Tambahkan situs karya, GitHub, Behance, atau profil profesional Anda.</p>
      <form className="mt-4 space-y-3" onSubmit={savePortfolio}><label className="label" htmlFor="candidate-portfolio-url">URL portofolio<input id="candidate-portfolio-url" className="input mt-1" type="url" maxLength={2048} placeholder="https://contoh.com/portofolio" value={currentPortfolioUrl} onChange={(event) => { setPortfolioUrl(event.target.value); setSaved(false); }} /></label>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}{saved && <p role="status" className="text-sm font-medium text-emerald-700">Tautan portofolio berhasil disimpan.</p>}
        <div className="flex flex-wrap items-center gap-3"><button className="btn-primary" type="submit" disabled={saving || !user}>{saving ? "Menyimpan…" : "Simpan portofolio"}</button>{currentPortfolioUrl && <a href={currentPortfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">Buka portofolio<ExternalLink className="h-3.5 w-3.5" /></a>}</div>
      </form>
    </section>
  </div>;
}
