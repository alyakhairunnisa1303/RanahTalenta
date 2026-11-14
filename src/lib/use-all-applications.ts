"use client";

import { useSyncExternalStore } from "react";
import { applications as seedApplications } from "../data/mockData";
import {
  getApplicationsSnapshot,
  subscribeLocalStore,
} from "./local-store";

export function useAllApplications() {
  return useSyncExternalStore(
    subscribeLocalStore,
    getApplicationsSnapshot,
    () => seedApplications
  );
}
