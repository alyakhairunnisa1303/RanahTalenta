"use client";

import { useState } from "react";
import Icon from "./Icons";
import ScoreBadge from "./ScoreBadge";
import { CompanyAvatar } from "./JobCard";
import { getUser } from "../data/mockData";
import { splitLines } from "../lib/format";
import type { Job, JobMatch, User } from "../types/hirematch";

export interface ApplyFormValues {
  name: string;
  email: string;
  phone: string;
  portfolioUrl: string;
  coverLetter: string;
  acceptedRequirements: boolean;
  confirmedTruth: boolean;
}

type FieldErrors = Partial<Record<keyof ApplyFormValues, string>>;

function validate(values: ApplyFormValues): FieldErrors {
  const errors: FieldErrors = {};

  if (values.name.trim().length < 2) {
    errors.name = "Nama lengkap wajib diisi.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Email tidak valid.";
  }
  if (!/^[0-9+\-\s()]{8,20}$/.test(values.phone.trim())) {
    errors.phone = "Nomor HP tidak valid.";
  }
  if (values.coverLetter.trim().length < 30) {
    errors.coverLetter = "Surat lamaran minimal 30 karakter.";
  }
  if (!values.acceptedRequirements) {
    errors.acceptedRequirements = "Konfirmasi pemenuhan persyaratan.";
  }
  if (!values.confirmedTruth) {
    errors.confirmedTruth = "Konfirmasi kebenaran data.";
  }

  return errors;
}

export default function ApplyDialog({
  job,
  candidate,
  match,
  submitting = false,
  error = "",
  onClose,
  onConfirm,
}: {
  job: Job;
  candidate?: User;
  match: JobMatch;
  submitting?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (values: ApplyFormValues) => void;
}) {
  const company = getUser(job.hrd_id);
  const requirements = splitLines(job.requirements);
  const [values, setValues] = useState<ApplyFormValues>(() => ({
    name: candidate?.name ?? "",
    email: candidate?.email ?? "",
    phone: candidate?.phone ?? "",
    portfolioUrl: candidate?.portfolio_url ?? "",
    coverLetter: "",
    acceptedRequirements: false,
    confirmedTruth: false,
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);

  const update = <K extends keyof ApplyFormValues>(
    key: K,
    value: ApplyFormValues[K]
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (touched) {
      setErrors(validate({ ...values, [key]: value }));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onConfirm(values);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-dialog-title"
        className="card-bold relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-b-none sm:rounded-b-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="eyebrow">Konfirmasi Lamaran</p>
            <h2
              id="apply-dialog-title"
              className="mt-0.5 text-xl font-extrabold tracking-tight text-ink-900"
            >
              Lengkapi data lamaran
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-ink-900"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <CompanyAvatar
                name={company?.company_name}
                className="h-11 w-11 text-base"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-900">{job.title}</p>
                <p className="text-sm text-slate-500">
                  {company?.company_name} · {job.location}
                </p>
              </div>
              <ScoreBadge score={match.match_score} />
            </div>
          </div>

          <div>
            <p className="label">Persyaratan lowongan</p>
            {requirements.length > 0 ? (
              <ul className="mt-2 space-y-1.5 rounded-xl border border-slate-200 p-3">
                {requirements.map((requirement, index) => (
                  <li
                    key={`${requirement}-${index}`}
                    className="flex items-start gap-2 text-sm text-slate-600"
                  >
                    <Icon
                      name="check"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                      strokeWidth={2.5}
                    />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Tidak ada persyaratan khusus yang dicantumkan.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="apply-name">
                Nama lengkap
              </label>
              <input
                id="apply-name"
                className="input mt-1.5"
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                required
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="apply-email">
                Email
              </label>
              <input
                id="apply-email"
                type="email"
                className="input mt-1.5"
                value={values.email}
                onChange={(event) => update("email", event.target.value)}
                required
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="apply-phone">
                Nomor HP
              </label>
              <input
                id="apply-phone"
                className="input mt-1.5"
                value={values.phone}
                onChange={(event) => update("phone", event.target.value)}
                placeholder="08xxxxxxxxxx"
                required
              />
              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="apply-portfolio">
                Portofolio / LinkedIn{" "}
                <span className="text-slate-400">(opsional)</span>
              </label>
              <input
                id="apply-portfolio"
                type="url"
                className="input mt-1.5"
                value={values.portfolioUrl}
                onChange={(event) => update("portfolioUrl", event.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="apply-cover-letter">
              Surat lamaran / motivasi
            </label>
            <textarea
              id="apply-cover-letter"
              className="input mt-1.5 min-h-28"
              value={values.coverLetter}
              onChange={(event) => update("coverLetter", event.target.value)}
              placeholder="Ceritakan alasan Anda cocok untuk posisi ini..."
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              {values.coverLetter.trim().length}/30 karakter minimal
            </p>
            {errors.coverLetter && (
              <p className="mt-1 text-xs text-red-600">{errors.coverLetter}</p>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.acceptedRequirements}
                onChange={(event) =>
                  update("acceptedRequirements", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                Saya memenuhi persyaratan lowongan ini dan bersedia mengikuti
                proses seleksi.
              </span>
            </label>
            {errors.acceptedRequirements && (
              <p className="text-xs text-red-600">
                {errors.acceptedRequirements}
              </p>
            )}

            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.confirmedTruth}
                onChange={(event) =>
                  update("confirmedTruth", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300"
              />
              <span>
                Saya menyatakan data dan CV yang dilampirkan benar dan dapat
                dipertanggungjawabkan.
              </span>
            </label>
            {errors.confirmedTruth && (
              <p className="text-xs text-red-600">{errors.confirmedTruth}</p>
            )}
          </div>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline text-sm font-bold"
              disabled={submitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary text-sm font-bold"
              disabled={submitting}
            >
              {submitting ? "Mengirim lamaran..." : "Kirim lamaran"}
              {!submitting && (
                <Icon name="arrowRight" className="ml-1.5 h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
