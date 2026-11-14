import { applications as seedApplications, jobs as seedJobs } from "../data/mockData";
import type { Application, Job } from "../types/hirematch";

const CV_KEY = "hirematch.candidate.cv";
const JOBS_KEY = "hirematch.custom.jobs";
const APPLICATIONS_KEY = "hirematch.applications";

type StoreListener = () => void;
const listeners = new Set<StoreListener>();

let jobsSnapshot: Job[] | null = null;
let applicationsSnapshot: Application[] | null = null;

function invalidateSnapshots(): void {
  jobsSnapshot = null;
  applicationsSnapshot = null;
}

function notify(): void {
  invalidateSnapshots();
  for (const listener of listeners) listener();
}

export function subscribeLocalStore(listener: StoreListener): () => void {
  listeners.add(listener);
  const onStorage = () => notify();
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getJobsSnapshot(): Job[] {
  if (!jobsSnapshot) jobsSnapshot = getAllJobs();
  return jobsSnapshot;
}

export function getApplicationsSnapshot(): Application[] {
  if (!applicationsSnapshot) applicationsSnapshot = getAllApplications();
  return applicationsSnapshot;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Penyimpanan penuh atau diblokir browser: abaikan agar UI tetap jalan.
  }
}

export function getCandidateCv(): string | null {
  if (!canUseStorage()) return null;
  try {
    return window.localStorage.getItem(CV_KEY);
  } catch {
    return null;
  }
}

export function saveCandidateCv(cvText: string): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CV_KEY, cvText);
  } catch {
    // abaikan
  }
}

export function getCustomJobs(): Job[] {
  return readJson<Job[]>(JOBS_KEY, []);
}

export function getAllJobs(): Job[] {
  return [...seedJobs, ...getCustomJobs()];
}

export function addCustomJob(job: Job): void {
  const custom = getCustomJobs();
  writeJson(JOBS_KEY, [...custom, job]);
  notify();
}

export function nextJobId(): number {
  return Math.max(0, ...getAllJobs().map((job) => job.id)) + 1;
}

export function nextApplicationId(): number {
  return Math.max(0, ...getAllApplications().map((application) => application.id)) + 1;
}

function getApplicationOverrides(): Application[] {
  return readJson<Application[]>(APPLICATIONS_KEY, []);
}

export function getAllApplications(): Application[] {
  const merged = new Map<number, Application>();
  for (const application of seedApplications) {
    merged.set(application.id, application);
  }
  for (const application of getApplicationOverrides()) {
    merged.set(application.id, application);
  }
  return Array.from(merged.values());
}

export function getApplicationsForCandidate(candidateId: number): Application[] {
  return getAllApplications().filter((a) => a.candidate_id === candidateId);
}

export function getApplicationsForJob(jobId: number): Application[] {
  return getAllApplications().filter((a) => a.job_id === jobId);
}

export function upsertApplication(application: Application): void {
  const overrides = getApplicationOverrides();
  const next = overrides.filter((item) => item.id !== application.id);
  next.push(application);
  writeJson(APPLICATIONS_KEY, next);
  notify();
}
