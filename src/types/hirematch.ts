// Tipe mengikuti kolom tabel di schema.sql. Memakai snake_case supaya
// respons API backend bisa dipakai langsung tanpa mapping.
// Kolom sensitif (password, verify_token, cv_path, cv_text) sengaja tidak ada di sisi front end.

export type UserRole = "candidate" | "hrd";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  company_name: string | null;
  legal_number: string | null;
  phone: string | null;
  portfolio_url: string | null;
  is_verified: boolean;
}

export type JobStatus = "open" | "closed" | "flagged";

export interface Job {
  id: number;
  hrd_id: number;
  title: string;
  description: string;
  requirements: string; // TEXT: satu kualifikasi per baris
  location: string;
  salary_range: string | null;
  status: JobStatus;
  created_at: string; // format YYYY-MM-DD
}

export interface JobMatch {
  id: number;
  candidate_id: number;
  job_id: number;
  match_score: number; // 0-100
  candidate_feedback: string;
  hr_strengths: string[]; // JSON
  hr_gaps: string[]; // JSON
  interview_questions: string[]; // JSON, 3 pertanyaan
  created_at: string;
}

export type ApplicationStatus = "pending" | "shortlisted" | "rejected";

export interface Application {
  id: number;
  job_match_id: number;
  candidate_id: number;
  job_id: number;
  status: ApplicationStatus;
  applied_at: string;
}

// Gabungan application + job_match + user, dipakai di leaderboard HRD
export interface ApplicantRow {
  application: Application;
  match: JobMatch;
  candidate: User;
}