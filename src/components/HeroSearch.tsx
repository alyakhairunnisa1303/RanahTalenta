"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Icon from "./Icons";

export default function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    router.push(`/${qs}#lowongan`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-xl border-2 border-ink-900 bg-white p-1.5 shadow-[4px_4px_0_0_var(--color-ink-900)]"
    >
      <Icon name="search" className="ml-3 h-5 w-5 shrink-0 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari posisi, perusahaan, atau skill…"
        className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-[15px] text-ink-900 outline-none placeholder:text-slate-400"
      />
      <button type="submit" className="btn-primary btn-hard">
        Cari
        <Icon name="arrowRight" className="h-4 w-4" strokeWidth={2.25} />
      </button>
    </form>
  );
}