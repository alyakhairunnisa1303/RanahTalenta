import type { CSSProperties } from "react";

export function scoreMeta(score: number) {
  if (score >= 80)
    return {
      label: "Highly Recommended",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      bar: "bg-emerald-500",
      accent: "border-l-emerald-500",
      stroke: "#10b981",
    };
  if (score >= 60)
    return {
      label: "Potential",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      bar: "bg-amber-500",
      accent: "border-l-amber-500",
      stroke: "#f59e0b",
    };
  return {
    label: "Not Recommended",
    className: "bg-red-50 text-red-700 ring-red-200",
    bar: "bg-red-500",
    accent: "border-l-red-500",
    stroke: "#ef4444",
  };
}

export default function ScoreBadge({
  score,
  showLabel = true,
}: {
  score: number;
  showLabel?: boolean;
}) {
  const meta = scoreMeta(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${meta.className}`}
    >
      <span className="tabular-nums">{score}%</span>
      {showLabel && (
        <>
          <span className="opacity-40">•</span>
          <span>{meta.label}</span>
        </>
      )}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const meta = scoreMeta(score);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full ${meta.bar}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}

export function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const meta = scoreMeta(score);
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={meta.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="animate-ring"
          style={{ "--ring-c": c } as CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold tabular-nums text-ink-900">
        {score}
      </span>
    </div>
  );
}