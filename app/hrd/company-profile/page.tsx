"use client";

import { useState, type FormEvent } from "react";
import { Building2, Check, Save, ShieldCheck } from "lucide-react";
import { useCurrentUser } from "../../../src/lib/use-current-user";

export default function HrdCompanyProfilePage() {
  const { user, loading, refresh } = useCurrentUser();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [legalNumber, setLegalNumber] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/hrd/company-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_name: companyName ?? user?.company_name ?? "", industry: industry ?? user?.industry ?? "", legal_number: legalNumber ?? user?.legal_number ?? "", phone: phone ?? user?.phone ?? "" }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Profil perusahaan gagal disimpan.");
      setCompanyName(null); setIndustry(null); setLegalNumber(null); setPhone(null);
      await refresh(); setMessage("Profil perusahaan berhasil diperbarui.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Profil perusahaan gagal disimpan."); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-8">
      <header><p className="eyebrow">Pengaturan</p><h1 className="mt-2 text-2xl font-bold text-ink-900">Profil Perusahaan</h1><p className="mt-1 text-sm text-slate-500">Perbarui informasi organisasi yang ditampilkan pada lowongan Anda.</p></header>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={save} className="card space-y-5 p-5 sm:p-7">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Building2 className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink-900">Informasi perusahaan</h2><p className="text-sm text-slate-500">Email akun: {user?.email ?? "—"}</p></div></div>
        <label className="label">Nama perusahaan<input className="input mt-1.5" required minLength={2} maxLength={200} value={companyName ?? user?.company_name ?? ""} onChange={(event) => setCompanyName(event.target.value)} disabled={loading} /></label>
        <label className="label">Bidang usaha<input className="input mt-1.5" required minLength={2} maxLength={120} placeholder="Contoh: Teknologi finansial, kesehatan, pendidikan" value={industry ?? user?.industry ?? ""} onChange={(event) => setIndustry(event.target.value)} disabled={loading} /><span className="mt-1 block text-xs font-normal text-slate-400">Jelaskan industri atau sektor utama perusahaan Anda.</span></label>
        <label className="label">Nomor legalitas<input className="input mt-1.5" required minLength={2} maxLength={100} value={legalNumber ?? user?.legal_number ?? ""} onChange={(event) => setLegalNumber(event.target.value)} disabled={loading} /><span className="mt-1 block text-xs font-normal text-slate-400">Contoh: NIB atau nomor registrasi badan usaha.</span></label>
        <label className="label">Nomor telepon perusahaan<input className="input mt-1.5" type="tel" maxLength={32} placeholder="+62 21 5550 1234" value={phone ?? user?.phone ?? ""} onChange={(event) => setPhone(event.target.value)} disabled={loading} /></label>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className={`h-4 w-4 ${user?.is_verified ? "text-emerald-600" : "text-amber-500"}`} />{user?.is_verified ? "Perusahaan terverifikasi" : "Status verifikasi: menunggu pemeriksaan"}</p>
          <div className="flex items-center gap-3"><span role="status" className="text-sm text-emerald-700">{message && <><Check className="mr-1 inline h-4 w-4" />{message}</>}</span><button disabled={saving || loading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Menyimpan…" : "Simpan profil"}</button></div>
        </div>
      </form>
    </div>
  );
}
