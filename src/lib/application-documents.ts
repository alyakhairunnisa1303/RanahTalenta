export const MAX_APPLICATION_DOCUMENT_BYTES = 5 * 1024 * 1024;

export interface ApplicationDocumentRecord {
  application_id: number;
  candidate_id: number;
  job_id: number;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  portfolio_url: string | null;
  cover_letter: string;
  file_name: string | null;
  file_type: string | null;
  file_size: number;
  updated_at: string;
}
