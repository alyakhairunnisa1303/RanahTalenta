"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, LockKeyhole, Save, Sparkles } from "lucide-react";

type Settings = { skill_weight: number; experience_weight: number; education_weight: number; review_threshold: number };
const DEFAULTS: Settings = { skill_weight: 60, experience_weight: 30, education_weight: 10, review_threshold: 60 };
const CRITERIA: { key: "skill_weight" | "experience_weight" | "education_weight"; label: string; detail: string }[] = [
  { key: "skill_weight", label: "Keterampilan", detail: "Kesesuaian kompetensi inti dan kebutuhan posisi." },
  { key: "experience_weight", label: "Pengalaman", detail: "Relevansi pengalaman kerja dan proyek kandidat." },
  { key: "education_weight", label: "Pendidikan", detail: "Kesesuaian pendidikan atau sertifikasi terkait." },
];

export default function HrdAiSettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    fetch("/api/hrd/ai-settings", { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { settings?: Settings; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Pengaturan gagal dimuat.");
      if (!cancelled && data.settings) setSettings(data.settings);
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Pengaturan gagal dimuat."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const total = settings.skill_weight + settings.experience_weight + settings.education_weight;
  function changeWeight(key: typeof CRITERIA[number]["key"], nextValue: number) {
    const remainingKeys = CRITERIA.map((criterion) => criterion.key).filter((item) => item !== key);
    const remainingTotal = 100 - nextValue;
    const previousRemaining = settings[remainingKeys[0]] + settings[remainingKeys[1]];
    const first = previousRemaining ? Math.round(remainingTotal * settings[remainingKeys[0]] / previousRemaining) : remainingTotal;
    setSettings((value) => ({ ...value, [key]: nextValue, [remainingKeys[0]]: first, [remainingKeys[1]]: remainingTotal - first }));
    setMessage("");
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/hrd/ai-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json() as { settings?: Settings; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Pengaturan gagal disimpan.");
      if (data.settings) setSettings(data.settings);
      setMessage("Preferensi berhasil disimpan.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Pengaturan gagal disimpan."); }
    finally { setSaving(false); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
      <header><p className="eyebrow">Pengaturan</p><h1 className="mt-2 text-2xl font-bold text-ink-900">Konfigurasi AI</h1><p className="mt-1 text-sm text-slate-500">Atur prioritas penilaian dan ambang rekomendasi untuk panduan tim rekrutmen.</p></header>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form onSubmit={save} className="space-y-5">
        <section className="card space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-semibold text-ink-900">Bobot prioritas seleksi</h2><p className="mt-1 text-sm text-slate-500">Total bobot harus 100%. Mengubah satu bobot akan menyesuaikan dua bobot lainnya.</p></div></div>
          {loading ? <p className="text-sm text-slate-500">Memuat preferensi…</p> : CRITERIA.map(({ key, label, detail }) => <label key={key} className="block"><span className="flex items-center justify-between text-sm font-semibold text-ink-900"><span>{label}<span className="mt-1 block text-xs font-normal text-slate-500">{detail}</span></span><span className="rounded-lg bg-slate-100 px-2.5 py-1 tabular-nums">{settings[key]}%</span></span><input className="mt-3 w-full accent-blue-700" type="range" min="0" max="100" step="5" value={settings[key]} onChange={(event) => changeWeight(key, Number(event.target.value))} /><span className="sr-only">Bobot {label}</span></label>)}
          <p className={`text-sm font-semibold ${total === 100 ? "text-emerald-700" : "text-rose-700"}`}>Total bobot: {total}% {total === 100 ? "✓" : "— total harus 100%"}</p>
        </section>
        <section className="card p-5 sm:p-6">
          <label className="block"><span className="font-semibold text-ink-900">Ambang rekomendasi untuk tinjauan</span><span className="mt-1 block text-sm text-slate-500">Skor minimum yang dipakai sebagai panduan shortlist di dashboard.</span><span className="mt-4 flex items-center gap-4"><input className="w-full accent-blue-700" type="range" min="0" max="100" step="5" value={settings.review_threshold} onChange={(event) => { setSettings((value) => ({ ...value, review_threshold: Number(event.target.value) })); setMessage(""); }} /><span className="w-12 text-right font-bold tabular-nums text-ink-900">{settings.review_threshold}%</span></span></label>
        </section>
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><div className="flex items-start gap-2"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><p><b>Blind screening tetap aktif.</b> Identitas kandidat tetap disamarkan sampai masuk shortlist. Bobot diterapkan pada screening yang dimulai setelah preferensi disimpan; skor sebelumnya tidak berubah. Bobot pendidikan hanya dihitung bila syarat lowongan mencantumkan kualifikasi atau sertifikasi terkait.</p></div></section>
        <div className="flex flex-wrap items-center justify-between gap-3"><span role="status" className="text-sm text-emerald-700">{message && <><Check className="mr-1 inline h-4 w-4" />{message}</>}</span><button disabled={saving || loading || total !== 100} className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />{saving ? "Menyimpan…" : "Simpan preferensi"}</button></div>
      </form>
    </div>
  );
}
