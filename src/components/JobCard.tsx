import Link from "next/link";
import type { Job } from "../types/hirematch";
import { getUser } from "../data/mockData";
import { formatDate, splitLines } from "../lib/format";
import Icon from "./Icons";

export function VerifiedBadge() {
  return (
    <span title="Perusahaan Terverifikasi" className="inline-flex items-center text-brand-600">
      <Icon name="badgeCheck" className="h-4 w-4" />
    </span>
  );
}

export function CompanyAvatar({
  name,
  className = "h-11 w-11 text-base",
}: {
  name?: string | null;
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg bg-brand-600 font-extrabold text-accent-400 ${className}`}
    >
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

export default function JobCard({
  job,
  candidateMode = false,
}: {
  job: Job;
  candidateMode?: boolean;
}) {
  // Pengganti JOIN jobs -> users (hrd_id)
  const company = getUser(job.hrd_id);
  const companyName = job.company_name ?? company?.company_name;
  const requirementsList = splitLines(job.requirements).slice(0, 2);

  // Dashboard publik wajib login; area pelamar langsung membuka detail lowongan.
  const loginUrl = `/login?role=candidate&from=job&jobId=${job.id}&jobTitle=${encodeURIComponent(
    job.title
  )}&redirect=${encodeURIComponent(`/candidate/jobs/${job.id}`)}`;
  const href = candidateMode ? `/candidate/jobs/${job.id}` : loginUrl;

  return (
    <Link
      href={href}
      className="card-bold lift group flex flex-col p-5 transition duration-200 hover:border-brand-600"
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar name={companyName} className="h-12 w-12 text-lg" />
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-bold leading-snug text-ink-900 group-hover:text-brand-600">
            {job.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-slate-500">
            <span className="truncate">{companyName}</span>
            {(job.company_is_verified ?? company?.is_verified) && <VerifiedBadge />}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip">
          <Icon name="pin" className="h-3.5 w-3.5 text-slate-500" />
          {job.location}
        </span>
        {job.salary_range && (
          <span className="chip font-semibold text-brand-700">
            <Icon name="wallet" className="h-3.5 w-3.5 text-brand-600" />
            {job.salary_range}
          </span>
        )}
      </div>

      <p className="mt-3.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
        {job.description}
      </p>

      {/* Ringkasan Kualifikasi */}
      {requirementsList.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {requirementsList.map((req, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
            >
              <Icon name="check" className="h-3 w-3 text-emerald-600" />
              <span className="truncate max-w-[200px]">{req}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5 border-t-2 border-dashed border-slate-200 pt-4 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-slate-400">{formatDate(job.created_at)}</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 font-semibold text-slate-600 transition group-hover:text-brand-600">
            <Icon name="sparkles" className="h-3.5 w-3.5 text-brand-600" />
            Cek Kecocokan CV
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-accent-400 px-2.5 py-1 font-bold text-ink-950 shadow-sm transition group-hover:bg-accent-300">
            {candidateMode ? "Lihat Detail" : "Lamar Sekarang"}
            <Icon name="arrowRight" className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </Link>
  );
}
