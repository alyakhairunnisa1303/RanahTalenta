"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell, { Segmented } from "@/components/AuthShell";
import { Logo } from "@/components/Navbar";
import Icon from "@/components/Icons";
import type { UserRole } from "@/types/hirematch";

const ROLE_OPTIONS = [
  ["candidate", "Pelamar"],
  ["hrd", "Perusahaan"],
] as const satisfies readonly (readonly [UserRole, string])[];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromApply = searchParams.get("from") === "apply";

  const [role, setRole] = useState<UserRole>("candidate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("hirematch_user", JSON.stringify({ role }));
    router.push(role === "candidate" ? "/candidate/dashboard" : "/hrd/dashboard");
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <Logo />

      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Masuk ke HireMatch AI
        </h1>
      </div>

      {/* From apply banner */}
      {fromApply && (
        <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-600">
          <Icon name="target" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Masuk untuk melihat kecocokan CV Anda dengan posisi ini</span>
        </div>
      )}

      {/* Demo notice */}
      <div className="flex items-start gap-3 rounded-lg border border-accent-400/40 bg-accent-400/10 px-4 py-3 text-sm text-ink-900">
        <Icon name="zap" className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
        <span>Demo mode — masukkan email apa saja untuk login</span>
      </div>

      {/* Role tabs */}
      <Segmented<UserRole>
        value={role}
        onChange={setRole}
        options={ROLE_OPTIONS}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-ink-900"
          >
            Email
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="mail" className="h-4 w-4" />
            </span>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="email@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-ink-900"
          >
            Kata Sandi
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
            />
            <button
              type="button"
              aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-ink-900"
            >
              <Icon name={showPassword ? "eyeOff" : "eye"} className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="btn-primary btn-hard w-full justify-center"
        >
          Masuk
        </button>
      </form>

      {/* Register link */}
      <p className="text-center text-sm text-slate-500">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-600 hover:underline"
        >
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
