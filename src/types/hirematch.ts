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
  industry?: string | null;
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
  company_name?: string | null;
  company_industry?: string | null;
  company_email?: string | null;
  company_legal_number?: string | null;
  company_is_verified?: boolean;
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
  ai_confidence?: number;
  ai_evidence?: string[];
  ai_criteria_scores?: {
    skill_score?: number;
    experience_score?: number;
    education_score?: number;
    education_applicable?: boolean;
    weights?: { skill_weight: number; experience_weight: number; education_weight: number };
  };
  created_at: string;
}

export type ApplicationStatus = "pending" | "shortlisted" | "rejected";
export type ScreeningStatus = "not_started" | "processing" | "completed" | "failed";

export interface Application {
  id: number;
  job_match_id: number;
  candidate_id: number;
  job_id: number;
  status: ApplicationStatus;
  screening_status?: ScreeningStatus;
  screening_step?: number;
    screening_completed_at?: string | null;
  screening_error?: string | null;
  applied_at: string;
  match_score?: number;
}

// Gabungan application + job_match + user, dipakai di leaderboard HRD
export interface ApplicantRow {
  application: Application;
  match: JobMatch;
  candidate: User;
}
