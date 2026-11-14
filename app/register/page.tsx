"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell, { Segmented } from "../../src/components/AuthShell";
import Icon from "../../src/components/Icons";
import type { UserRole } from "../../src/types/hirematch";

const PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.id",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
];

function RegisterForm() {
  const params = useSearchParams();
  const queryRole = params.get("role") as UserRole | null;
  const [role, setRole] = useState<UserRole>(
    queryRole === "hrd" ? "hrd" : "candidate"
  );
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");

  function validateEmail(value: string, currentRole: UserRole = role): string {
    if (currentRole !== "hrd") return "";
    const domain = value.split("@")[1]?.toLowerCase();
    if (domain && PUBLIC_DOMAINS.includes(domain)) {
      return "Gunakan email perusahaan. Domain publik seperti @gmail.com tidak diperbolehkan.";
    }
    return "";
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (!err) setStep("otp");
  }

  const roles: [UserRole, string][] = [
    ["candidate", "Fitur Pelamar"],
    ["hrd", "Fitur HRD (Perusahaan)"],
  ];

  if (step === "otp") {
    return (
      <div className="w-full max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon name="mail" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink-900">
          Verifikasi email Anda
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Kami mengirim kode OTP ke <b className="text-ink-900">{email}</b>.
          Masukkan 6 digit kode untuk mengaktifkan akun.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <input
              key={i}
              maxLength={1}
              inputMode="numeric"
              onChange={(e) => {
                if (e.target.value)
                  (e.target.nextElementSibling as HTMLInputElement | null)?.focus();
              }}
              className="h-13 w-11 rounded-lg border border-slate-300 bg-white text-center text-lg font-bold outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          ))}
        </div>
        <Link href={`/login?role=${role}`} className="btn-primary btn-hard btn-lg mt-6 w-full">
          Verifikasi &amp; lanjut masuk
        </Link>
        <button
          onClick={() => setStep("form")}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600"
        >
          <Icon name="arrowLeft" className="h-4 w-4" />
          Ubah data pendaftaran
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 transition"
      >
        <Icon name="arrowLeft" className="h-4 w-4" />
        Kembali ke Dashboard Publik
      </Link>

      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Buat akun</h1>
      <p className="mt-2 text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href={`/login?role=${role}`} className="font-semibold text-brand-600 hover:underline">
          Masuk
        </Link>
      </p>

      <div className="mt-6">
        <Segmented
          value={role}
          onChange={(v) => {
            setRole(v);
            setEmailError(validateEmail(email, v));
          }}
          options={roles}
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label">
            {role === "hrd" ? "Nama Penanggung Jawab (HRD)" : "Nama Lengkap"}
          </label>
          <input name="name" required className="input" placeholder="Nama lengkap" />
        </div>

        {role === "hrd" && (
          <>
            <div>
              <label className="label">Nama Perusahaan</label>
              <input
                name="company_name"
                required
                className="input"
                placeholder="PT Contoh Maju"
              />
            </div>
            <div>
              <label className="label">Nomor Legalitas (NIB / NPWP)</label>
              <input
                name="legal_number"
                required
                className="input"
                placeholder="Masukkan NIB atau NPWP"
              />
            </div>
          </>
        )}

        <div>
          <label className="label">
            {role === "hrd" ? "Email Perusahaan" : "Email"}
          </label>
          <input
            name="email"
            type="email"
            required
            className={`input ${emailError ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
            placeholder={role === "hrd" ? "hrd@perusahaan.co.id" : "nama@email.com"}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(validateEmail(e.target.value));
            }}
          />
          {emailError && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
              <Icon name="alert" className="h-3.5 w-3.5" />
              {emailError}
            </p>
          )}
          {role === "hrd" && !emailError && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <Icon name="badgeCheck" className="h-3.5 w-3.5 text-brand-600" />
              Akun yang lolos verifikasi mendapat lencana Verified Company.
            </p>
          )}
        </div>

        {role === "candidate" && (
          <>
            <div>
              <label className="label">Nomor WhatsApp (opsional)</label>
              <input name="phone" className="input" placeholder="+62 8xx-xxxx-xxxx" />
              <p className="mt-1.5 text-xs text-slate-500">
                Hanya dibuka ke HRD setelah Anda di-shortlist.
              </p>
            </div>
            <div>
              <label className="label">Portofolio / LinkedIn / GitHub (opsional)</label>
              <input
                name="portfolio_url"
                className="input"
                placeholder="github.com/username"
              />
            </div>
          </>
        )}

        <div>
          <label className="label">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            className="input"
            placeholder="Minimal 8 karakter"
          />
        </div>

        <button
          type="submit"
          className="btn-primary btn-hard btn-lg w-full"
          disabled={!!emailError}
        >
          Daftar sebagai {role === "candidate" ? "Pelamar" : "HRD"}
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="w-full max-w-md py-12 text-center text-slate-400">Memuat formulir pendaftaran...</div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
