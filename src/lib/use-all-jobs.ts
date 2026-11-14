"use client";

import { useSyncExternalStore } from "react";
import { jobs as seedJobs } from "../data/mockData";
import { getJobsSnapshot, subscribeLocalStore } from "./local-store";

export function useAllJobs() {
  return useSyncExternalStore(
    subscribeLocalStore,
    getJobsSnapshot,
    () => seedJobs
  );
}
