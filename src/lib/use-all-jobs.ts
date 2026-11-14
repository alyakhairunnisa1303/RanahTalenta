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
      const result = (await response.json()) as { jobs: Job[] };
      if (!cancelled) setJobs(result.jobs);
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
