"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { Segmented } from "../../src/components/AuthShell";
import Icon from "../../src/components/Icons";
import type { UserRole } from "../../src/types/hirematch";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryRole = params.get("role") as UserRole | null;
  const from = params.get("from");
  const jobTitle = params.get("jobTitle");
  const redirect = params.get("redirect");

  const [role, setRole] = useState<UserRole>(
    queryRole === "hrd" ? "hrd" : "candidate"
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          password: data.get("password"),
          role,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Login gagal.");
      router.push(role === "candidate" ? redirect || "/candidate/dashboard" : "/hrd/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  const roles: [UserRole, string][] = [
    ["candidate", "Fitur Pelamar"],
    ["hrd", "Fitur HRD (Perusahaan)"],
  ];

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 transition"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Kembali ke Dashboard Publik
      </Link>

      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
        Selamat datang kembali
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link
          href={`/register?role=${role}`}
          className="font-semibold text-brand-600 hover:underline"
        >
          Daftar {role === "candidate" ? "Pelamar" : "Perusahaan"}
        </Link>
      </p>

      {/* Banner informasi jika pelamar diarahkan saat memilih pekerjaan */}
      {(from === "job" || from === "apply") && (
        <div className="mt-5 flex gap-3 rounded-xl border-2 border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          <Icon name="sparkles" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
          <div>
            <p className="font-bold">Akses Fitur Pelamar</p>
            <p className="mt-0.5 text-xs leading-relaxed text-brand-800">
              {jobTitle ? (
                <>
                  Silakan masuk sebagai <b>Pelamar</b> terlebih dahulu untuk melihat detail lengkap dan melamar posisi <b>{jobTitle}</b>.
                </>
              ) : (
                "Silakan masuk sebagai Pelamar untuk mengakses detail lowongan dan fitur pencocokan CV AI."
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6">
        <Segmented value={role} onChange={setRole} options={roles} />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">
            {role === "hrd" ? "Email Perusahaan" : "Email Pelamar"}
          </label>
          <input
            name="email"
            type="email"
            required
            className="input"
            placeholder={role === "hrd" ? "hrd@perusahaan.co.id" : "nama@email.com"}
          />
        </div>
        <div>
          <label className="label">Password</label>
          <input
            name="password"
            type="password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary btn-hard btn-lg w-full" disabled={submitting}>
          {submitting ? "Memeriksa akun..." : `Masuk sebagai ${role === "candidate" ? "Pelamar" : "HRD"}`}
        </button>
      </form>

      <div className="mt-6 rounded-lg bg-slate-50 p-3.5 text-xs text-slate-500">
        Masuk menggunakan email dan password akun yang sudah terdaftar.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="w-full max-w-md py-12 text-center text-slate-400">Memuat formulir masuk...</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
