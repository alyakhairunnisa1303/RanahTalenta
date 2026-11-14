import Link from "next/link";

export default function MatchCard({
  title = "Frontend Developer",
  score = 92,
  tag = "Remote",
  salary = "Rp 9–14 jt",
}: {
  title?: string;
  score?: number;
  tag?: string;
  salary?: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-200 bg-white shadow-[0_28px_60px_-24px_rgba(0,0,0,0.55)]">
      {/* Panel biru */}
      <div className="bg-brand-600 px-6 pb-6 pt-6 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-400">
          AI Matchmaker
        </p>
        <h3 className="mt-3 text-xl font-bold leading-snug">
          Temukan peran yang paling cocok
        </h3>
        <div className="mt-5 flex gap-3">
          <Link href="/login?from=apply" className="btn-primary">
            Lamar
          </Link>
          <Link href="#lowongan" className="btn-ghost-light">
            Detail
          </Link>
        </div>
      </div>

      {/* Kartu dalam */}
      <div className="p-4">
        <div className="rounded-2xl border-[1.5px] border-brand-600 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-ink-900">{title}</p>
            <span className="pill-score">{score}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip-accent">{tag}</span>
            <span className="chip">{salary}</span>
          </div>
        </div>
      </div>
    </div>
  );
}