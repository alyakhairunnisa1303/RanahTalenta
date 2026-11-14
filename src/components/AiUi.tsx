"use client";

import { useEffect, useState, type ReactNode } from "react";
import Icon, { type IconName } from "./Icons";

export function PulseDot({ className = "bg-emerald-400" }: { className?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${className}`}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}

export function AiPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-400 px-2.5 py-1 text-[11px] font-bold text-ink-950">
      <Icon name="sparkles" className="h-3 w-3" />
      {children}
    </span>
  );
}

// Angka yang menghitung naik saat tampil
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular-nums">{n}</span>;
}

export function AiInsight({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ai-card p-5 ${className}`}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-sky-500 text-white">
          <Icon name="sparkles" className="h-4 w-4" />
        </span>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-ink-950 p-6 text-white shadow-lg sm:p-8">
      <div className="pointer-events-none absolute -right-10 -top-24 h-72 w-72 animate-float rounded-full bg-brand-600/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 animate-float rounded-full bg-accent-400/20 blur-3xl [animation-delay:-4s]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-200">
            <PulseDot className="bg-accent-400" />
            {eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
            {subtitle}
          </p>
        </div>
        {action}
      </div>

      {children && (
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">{children}</div>
      )}
    </section>
  );
}

export function HeroStat({
  label,
  icon,
  children,
}: {
  label: string;
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
        <Icon name={icon} className="h-4 w-4 text-accent-400" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{children}</p>
    </div>
  );
}