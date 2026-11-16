"use client";

import { useEffect, useState } from "react";
import type { Job } from "../types/hirematch";
import { DATA_CHANGED_EVENT } from "./client-events";

export function useAllJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/jobs", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const result: unknown = await response.json().catch(() => null);
      const payload =
        result && typeof result === "object" ? (result as Record<string, unknown>) : null;
      const data =
        payload?.data && typeof payload.data === "object"
          ? (payload.data as Record<string, unknown>)
          : null;
      const nextJobs = Array.isArray(payload?.jobs)
        ? payload.jobs
        : Array.isArray(data?.jobs)
          ? data.jobs
          : [];
      if (!cancelled) setJobs(nextJobs as Job[]);
    };
    void load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(DATA_CHANGED_EVENT, load);
    };
  }, []);

  return jobs;
}
