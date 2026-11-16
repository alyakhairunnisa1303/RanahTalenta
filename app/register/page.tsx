"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { Segmented } from "../../src/components/AuthShell";
import Icon from "../../src/components/Icons";
import { checkCompany } from "../../src/lib/screen-client";
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
  const router = useRouter();
  const params = useSearchParams();
  const queryRole = params.get("role") as UserRole | null;
  const [role, setRole] = useState<UserRole>(
    queryRole === "hrd" ? "hrd" : "candidate"
  );
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [companyError, setCompanyError] = useState("");
  const [checking, setChecking] = useState(false);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [pendingRegistration, setPendingRegistration] = useState<Record<string, string> | null>(null);
  const [registering, setRegistering] = useState(false);

  function validateEmail(value: string, currentRole: UserRole = role): string {
    if (currentRole !== "hrd") return "";
    const domain = value.split("@")[1]?.toLowerCase();
    if (domain && PUBLIC_DOMAINS.includes(domain)) {
      return "Gunakan email perusahaan. Domain publik seperti @gmail.com tidak diperbolehkan.";
    }
    return "";
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    const data = new FormData(e.currentTarget);
    const companyName = String(data.get("company_name") ?? "").trim();
    const companyEmail = String(data.get("email") ?? email).trim();
    const registration: Record<string, string> = {
      name: String(data.get("name") ?? "").trim(),
      email: companyEmail,
      password: String(data.get("password") ?? ""),
      role,
      phone: String(data.get("phone") ?? "").trim(),
      portfolio_url: String(data.get("portfolio_url") ?? "").trim(),
      company_name: companyName,
      legal_number: String(data.get("legal_number") ?? "").trim(),
    };

    if (role !== "hrd") {
      setPendingRegistration(registration);
      setStep("confirm");
      return;
    }

    if (!companyName) {
      setCompanyError("Nama perusahaan wajib diisi.");
      return;
    }

    setChecking(true);
    setCompanyError("");

    try {
      const response = await checkCompany(companyName, companyEmail);
      if (response.decision === "blocked") {
        setCompanyError(response.result.reason);
        return;
      }
      setPendingRegistration(registration);
      setStep("confirm");
    } catch (checkErr: unknown) {
      setCompanyError(
        checkErr instanceof Error
          ? checkErr.message
          : "Gagal memverifikasi perusahaan."
      );
    } finally {
      setChecking(false);
    }
  }

  async function completeRegistration() {
    if (!pendingRegistration) return;
    setRegistering(true);
    setCompanyError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingRegistration),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Pendaftaran gagal.");
      router.push(role === "candidate" ? "/candidate/dashboard" : "/hrd/dashboard");
      router.refresh();
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : "Pendaftaran gagal.");
    } finally {
      setRegistering(false);
    }
  }

  const roles: [UserRole, string][] = [
    ["candidate", "Fitur Pelamar"],
    ["hrd", "Fitur HRD (Perusahaan)"],
  ];

  if (step === "confirm") {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Icon name="mail" className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink-900">
          Konfirmasi pendaftaran
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Akun untuk <b className="text-ink-900">{email}</b> akan dibuat dan disimpan di database.
        </p>
        {companyError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{companyError}</p>}
        <button onClick={() => void completeRegistration()} disabled={registering} className="btn-primary btn-hard btn-lg mt-6 w-full">
          {registering ? "Membuat akun..." : "Buat akun & lanjut masuk"}
        </button>
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
    <div className="mx-auto w-full max-w-[34rem]">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Buat akun</h1>
      <p className="mt-2 text-sm text-slate-500">
        Sudah punya akun?{" "}
        <Link href={`/login?role=${role}`} className="font-semibold text-brand-600 hover:underline">
          Masuk
        </Link>
      </p>

      <div className="mt-6 w-full">
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
            minLength={10}
            className="input"
            placeholder="Minimal 10 karakter"
          />
        </div>

        {companyError && (
          <p className="flex items-center gap-1.5 rounded-lg bg-red-50 p-3 text-xs text-red-600">
            <Icon name="alert" className="h-4 w-4 shrink-0" />
            {companyError}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary btn-hard btn-lg w-full"
          disabled={!!emailError || checking}
        >
          {checking
            ? "AI memverifikasi perusahaan…"
            : `Daftar sebagai ${role === "candidate" ? "Pelamar" : "HRD"}`}
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
