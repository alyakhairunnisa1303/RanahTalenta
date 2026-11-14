import Link from "next/link";
import type { Job } from "../types/hirematch";
import { getUser } from "../data/mockData";
import { formatDate } from "../lib/format";
import Icon from "./Icons";

export function VerifiedBadge() {
  return (
    <span title="Verified Company" className="inline-flex text-brand-600">
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

export default function JobCard({ job }: { job: Job }) {
  // Pengganti JOIN jobs -> users (hrd_id)
  const company = getUser(job.hrd_id);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="card-bold lift group flex flex-col p-5"
    >
      <div className="flex items-start gap-3">
        <CompanyAvatar name={company?.company_name} className="h-12 w-12 text-lg" />
        <div className="min-w-0">
          <h3 className="text-[17px] font-bold leading-snug text-ink-900">
            {job.title}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm font-medium text-slate-500">
            <span className="truncate">{company?.company_name}</span>
            {company?.is_verified && <VerifiedBadge />}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="chip">
          <Icon name="pin" className="h-3.5 w-3.5" />
          {job.location}
        </span>
        {job.salary_range && (
          <span className="chip">
            <Icon name="wallet" className="h-3.5 w-3.5" />
            {job.salary_range}
          </span>
        )}
      </div>

      <p className="mt-4 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
        {job.description}
      </p>

      <div className="mt-5 flex items-center justify-between border-t-2 border-dashed border-slate-200 pt-4 text-xs">
        <span className="font-medium text-slate-400">{formatDate(job.created_at)}</span>
        <span className="inline-flex items-center gap-2 font-bold text-ink-900">
          Lihat detail
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-400 text-ink-950 transition group-hover:translate-x-0.5">
            <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2.25} />
          </span>
        </span>
      </div>
    </Link>
  );
}