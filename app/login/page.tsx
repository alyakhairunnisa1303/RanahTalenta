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
  const fromApply = params.get("from") === "apply";
  const [role, setRole] = useState<UserRole>("candidate");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // TODO: ganti dengan panggilan API login. Sementara hanya navigasi demo.
    router.push(role === "hrd" ? "/hrd/dashboard" : "/candidate/dashboard");
  }

  const roles: [UserRole, string][] = [
    ["candidate", "Pelamar"],
    ["hrd", "Perusahaan (HRD)"],
  ];

  return (
    <div className="w-full max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">
        Selamat datang kembali
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Daftar
        </Link>
      </p>

      {fromApply && (
        <div className="mt-5 flex gap-3 rounded-lg border border-brand-100 bg-brand-50 p-3.5 text-sm text-brand-800">
          <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0" />
          Masuk untuk melihat kecocokan CV Anda dengan posisi ini.
        </div>
      )}

      <div className="mt-6">
        <Segmented value={role} onChange={setRole} options={roles} />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" required className="input" placeholder="nama@email.com" />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required className="input" placeholder="••••••••" />
        </div>
        <button type="submit" className="btn-primary btn-hard btn-lg w-full">
          Masuk
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}