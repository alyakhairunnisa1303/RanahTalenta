"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell, { Segmented } from "@/components/AuthShell";
import { Logo } from "@/components/Navbar";
import Icon from "@/components/Icons";
import type { UserRole } from "@/types/hirematch";

const ROLE_OPTIONS = [
  ["candidate", "Pelamar"],
  ["hrd", "Perusahaan"],
] as const satisfies readonly (readonly [UserRole, string])[];

const BENEFITS = [
  "Gratis selamanya untuk pelamar",
  "Data CV Anda aman & terenkripsi",
];

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("candidate");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [npwp, setNpwp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem("hirematch_user", JSON.stringify({ role }));
    router.push(role === "candidate" ? "/candidate/dashboard" : "/hrd/dashboard");
  }

  return (
    <AuthShell>
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <Logo />

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            Buat Akun HireMatch AI
          </h1>
        </div>

        {/* Role tabs */}
        <Segmented<UserRole>
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "candidate" ? (
            /* Candidate fields */
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-ink-900"
                >
                  Nama Lengkap
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="user" className="h-4 w-4" />
                  </span>
                  <input
                    id="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Nama Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>

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
            </>
          ) : (
            /* Company (HRD) fields */
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="company-name"
                  className="block text-sm font-semibold text-ink-900"
                >
                  Nama Perusahaan
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="building" className="h-4 w-4" />
                  </span>
                  <input
                    id="company-name"
                    type="text"
                    required
                    placeholder="PT. Contoh Indonesia"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="npwp"
                  className="block text-sm font-semibold text-ink-900"
                >
                  Nomor NPWP
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon name="file" className="h-4 w-4" />
                  </span>
                  <input
                    id="npwp"
                    type="text"
                    required
                    placeholder="00.000.000.0-000.000"
                    value={npwp}
                    onChange={(e) => setNpwp(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>

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
                    placeholder="email@perusahaan.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-9"
                  />
                </div>
              </div>
            </>
          )}

          {/* Password (shared) */}
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
                autoComplete="new-password"
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
            Daftar Sekarang
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-slate-500">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-600 hover:underline"
          >
            Masuk
          </Link>
        </p>

        {/* Benefits */}
        <ul className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-2 text-sm text-slate-600">
              <Icon name="check" className="h-4 w-4 shrink-0 text-brand-600" />
              {b}
            </li>
          ))}
        </ul>
      </div>
    </AuthShell>
  );
}
