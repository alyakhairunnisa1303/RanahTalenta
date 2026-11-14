import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { query } from "@/src/lib/db";
import type { ApplicantRow } from "@/src/types/hirematch";

export async function GET(_request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });
  const jobId = Number((await params).jobId);
  if (!Number.isSafeInteger(jobId) || jobId < 1) return NextResponse.json({ error: "ID lowongan tidak valid." }, { status: 400 });

  try {
    const result = await query(
      `SELECT a.id AS application_id, a.job_match_id, a.candidate_id, a.job_id, a.status, a.screening_status, a.screening_step, a.screening_error, a.applied_at::text AS applied_at,
              jm.match_score, jm.candidate_feedback, jm.hr_strengths, jm.hr_gaps, jm.interview_questions, jm.ai_confidence, jm.ai_evidence, jm.ai_criteria_scores, jm.created_at AS match_created_at,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(d.applicant_name, u.name) ELSE 'Kandidat #' || LPAD(a.id::text, 3, '0') END AS name,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(d.applicant_email, u.email) ELSE NULL END AS email,
              u.role, u.company_name, u.legal_number,
              CASE WHEN a.status = 'shortlisted' THEN d.applicant_phone ELSE NULL END AS phone,
              CASE WHEN a.status = 'shortlisted' THEN COALESCE(d.portfolio_url, u.portfolio_url) ELSE NULL END AS portfolio_url,
              u.is_verified
       FROM applications a
       JOIN jobs j ON j.id = a.job_id AND j.hrd_id = $2
       JOIN job_matches jm ON jm.id = a.job_match_id
       JOIN users u ON u.id = a.candidate_id
       LEFT JOIN application_documents d ON d.application_id = a.id
       WHERE a.job_id = $1 ORDER BY jm.match_score DESC, a.applied_at DESC`,
      [jobId, user.id],
    );
    const rows: ApplicantRow[] = result.rows.map((row) => ({
      application: { id: row.application_id, job_match_id: row.job_match_id, candidate_id: row.candidate_id, job_id: row.job_id, status: row.status, screening_status: row.screening_status, screening_step: row.screening_step, screening_error: row.screening_error, applied_at: row.applied_at },
      match: { id: row.job_match_id, candidate_id: row.candidate_id, job_id: row.job_id, match_score: row.match_score, candidate_feedback: row.candidate_feedback, hr_strengths: row.hr_strengths, hr_gaps: row.hr_gaps, interview_questions: row.interview_questions, ai_confidence: row.ai_confidence, ai_evidence: row.ai_evidence, ai_criteria_scores: row.ai_criteria_scores, created_at: row.match_created_at.toISOString() },
      candidate: { id: row.candidate_id, name: row.name, email: row.email, role: row.role, company_name: row.company_name, legal_number: row.legal_number, phone: row.phone, portfolio_url: row.portfolio_url, is_verified: row.is_verified },
    }));
    return NextResponse.json({ applicants: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Daftar pelamar gagal dimuat." }, { status: 503 });
  }
}
