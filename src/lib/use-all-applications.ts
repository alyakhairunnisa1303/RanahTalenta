"use client";

import { useEffect, useState } from "react";
import type { Application } from "../types/hirematch";
import { DATA_CHANGED_EVENT } from "./client-events";

export function useAllApplications() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const response = await fetch("/api/applications", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const result = (await response.json()) as { applications: Application[] };
      if (!cancelled) setApplications(result.applications);
    };
    void load();
    window.addEventListener(DATA_CHANGED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(DATA_CHANGED_EVENT, load);
    };
  }, []);

  return applications;
}
