"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { Segmented } from "../../src/components/AuthShell";
import Icon from "../../src/components/Icons";
import type { UserRole } from "../../src/types/hirematch";

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.error === "string") return record.error;

  const nestedMessage = getErrorMessage(record.error) ?? getErrorMessage(record.data);
  return nestedMessage;
}

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
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(getErrorMessage(result) ?? "Login gagal. Periksa kembali email dan password Anda.");
      }
      router.push(role === "candidate" ? redirect || "/candidate/dashboard" : "/hrd/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  const roles: [UserRole, string][] = [
    ["candidate", "Pelamar"],
    ["hrd", "Perusahaan"],
  ];
  const roleLabel = role === "candidate" ? "Pelamar" : "Perusahaan";

  return (
    <div className="mx-auto w-full max-w-[34rem] space-y-6">
      <header className="space-y-2.5 px-5 sm:px-7">
        <p className="eyebrow">Akses akun HireMatch AI</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Selamat datang kembali
        </h1>
        <p className="text-sm leading-relaxed text-slate-500">
          Belum punya akun?{" "}
          <Link
            href={`/register?role=${role}`}
            className="font-semibold text-brand-600 underline-offset-4 hover:underline"
          >
            Daftar sekarang
          </Link>
        </p>
      </header>

      {/* Banner informasi jika pelamar diarahkan saat memilih pekerjaan */}
      {(from === "job" || from === "apply") && (
        <div className="flex gap-3 rounded-2xl border border-brand-200 bg-brand-50/80 p-4 text-sm leading-relaxed text-brand-900 shadow-sm shadow-brand-900/5">
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

      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] sm:p-7">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Masuk sebagai</p>
        <Segmented value={role} onChange={setRole} options={roles} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="label" htmlFor="email">
            Email {roleLabel}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="input"
            placeholder={role === "hrd" ? "hr@perusahaan.co.id" : "nama@email.com"}
          />
        </div>
        <div className="space-y-2">
          <label className="label" htmlFor="password">Kata sandi</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="input"
            placeholder="••••••••"
          />
        </div>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary btn-hard btn-lg w-full justify-center rounded-xl" disabled={submitting}>
          {submitting ? "Memeriksa akun..." : `Masuk sebagai ${roleLabel}`}
        </button>
      </form>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-500">
        Masuk menggunakan email dan kata sandi akun yang sudah terdaftar.
      </div>
      </section>
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
