import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { handleScreenRequest } from "@/src/lib/screen-handler";
import { inTransaction, query } from "@/src/lib/db";
import type { SemanticMatchResult } from "@/src/types/contract";

type ScreeningSource = {
  job_match_id: number;
  title: string;
  description: string;
  requirements: string;
  company_name: string;
  company_email: string;
  cv_text: string;
  skill_weight: number;
  experience_weight: number;
  education_weight: number;
};

type ScreeningResponse = {
  status?: string;
  match?: SemanticMatchResult;
  validation?: { reject_reason?: string };
  error?: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Silakan masuk sebagai HRD." }, { status: 401 });
  if (user.role !== "hrd") return NextResponse.json({ error: "Akses HRD diperlukan." }, { status: 403 });

  const applicationId = Number((await params).applicationId);
  if (!Number.isSafeInteger(applicationId) || applicationId < 1) {
    return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  }

  try {
    const sourceResult = await query<ScreeningSource>(
      `SELECT a.job_match_id, j.title, j.description, j.requirements,
              u.company_name, u.email AS company_email, p.cv_text,
              COALESCE(s.skill_weight, 60) AS skill_weight,
              COALESCE(s.experience_weight, 30) AS experience_weight,
              COALESCE(s.education_weight, 10) AS education_weight
       FROM applications a
       JOIN jobs j ON j.id = a.job_id AND j.hrd_id = $2
       JOIN users u ON u.id = j.hrd_id
       JOIN candidate_profiles p ON p.candidate_id = a.candidate_id
       LEFT JOIN hrd_ai_settings s ON s.hrd_id = j.hrd_id
       WHERE a.id = $1`,
      [applicationId, user.id],
    );
    const source = sourceResult.rows[0];
    if (!source) return NextResponse.json({ error: "Lamaran atau CV tidak ditemukan." }, { status: 404 });
    if (!source.cv_text.trim()) {
      await query(
        "UPDATE applications SET screening_status = 'failed', screening_error = $2 WHERE id = $1",
        [applicationId, "CV pelamar masih kosong."],
      );
      return NextResponse.json({ error: "CV pelamar masih kosong." }, { status: 422 });
    }

    const claimed = await query(
      `UPDATE applications a SET screening_status = 'processing', screening_step = 0, screening_started_at = NOW(), screening_error = NULL
       FROM jobs j
       WHERE a.id = $1 AND a.job_id = j.id AND j.hrd_id = $2
         AND EXISTS (
           SELECT 1 FROM candidate_profiles p
           WHERE p.candidate_id = a.candidate_id AND BTRIM(p.cv_text) <> ''
         )
         AND (
           a.screening_status IN ('not_started', 'failed')
           OR (a.screening_status = 'processing' AND (a.screening_started_at IS NULL OR a.screening_started_at < NOW() - INTERVAL '10 minutes'))
         )
       RETURNING a.id`,
      [applicationId, user.id],
    );

    if (!claimed.rowCount) {
      const current = await query<{ screening_status: string }>(
        `SELECT a.screening_status FROM applications a JOIN jobs j ON j.id = a.job_id
         WHERE a.id = $1 AND j.hrd_id = $2`,
        [applicationId, user.id],
      );
      if (!current.rowCount) return NextResponse.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
      if (current.rows[0].screening_status === "completed") {
        return NextResponse.json({ screening_status: "completed", already_screened: true });
      }
      return NextResponse.json({
        error: "Screening AI untuk pelamar ini sedang berjalan.",
        screening_status: current.rows[0].screening_status,
      }, { status: 409 });
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.SCREEN_API_TOKEN) headers.Authorization = `Bearer ${process.env.SCREEN_API_TOKEN}`;
      const response = await handleScreenRequest(new Request("http://hirematch.local/api/screen", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "cv",
          cvText: source.cv_text,
          jobTitle: source.title,
          jobDescription: `${source.title}\n${source.description}\n\nKualifikasi:\n${source.requirements}`,
          companyName: source.company_name,
          hrdEmail: source.company_email,
          criteriaWeights: {
            skill_weight: source.skill_weight,
            experience_weight: source.experience_weight,
            education_weight: source.education_weight,
          },
        }),
      }), async (step) => {
        await query(
          `UPDATE applications SET screening_step = $2
           WHERE id = $1 AND screening_status = 'processing'`,
          [applicationId, step],
        );
        // Beri jeda singkat agar perubahan tahapan terbaca jelas di panel HRD.
        await new Promise((resolve) => setTimeout(resolve, 220));
      }, { requireLiveGemini: true });
      const screened = await response.json() as ScreeningResponse;
      if (!response.ok || screened.status !== "scored" || !screened.match) {
        throw new Error(screened.validation?.reject_reason ?? screened.error ?? "AI belum berhasil menilai CV ini.");
      }

      const match = screened.match;
      const strengths = match.matched_skills.length
        ? match.matched_skills
        : match.hr_strengths.split(/\n|;|,(?=\s)/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
      const gaps = match.missing_skills.length
        ? match.missing_skills
        : match.hr_gaps.split(/\n|;|,(?=\s)/).map((item) => item.trim()).filter(Boolean).slice(0, 20);

      await inTransaction(async (client) => {
        await client.query(
          `UPDATE job_matches SET match_score = $1, candidate_feedback = $2,
             hr_strengths = $3::jsonb, hr_gaps = $4::jsonb, interview_questions = $5::jsonb,
             ai_confidence = $6, ai_evidence = $7::jsonb, ai_criteria_scores = $8::jsonb, created_at = NOW()
           WHERE id = $9`,
          [match.match_score, match.candidate_feedback, JSON.stringify(strengths), JSON.stringify(gaps), JSON.stringify(match.interview_questions), match.confidence, JSON.stringify(match.evidence), JSON.stringify({ skill_score: match.skill_score, experience_score: match.experience_score, education_score: match.education_score, education_applicable: match.education_applicable, weights: { skill_weight: source.skill_weight, experience_weight: source.experience_weight, education_weight: source.education_weight } }), source.job_match_id],
        );
        await client.query(
          `UPDATE applications SET screening_status = 'completed', screening_step = 4, screening_completed_at = NOW(), screening_error = NULL
           WHERE id = $1 AND screening_status = 'processing'`,
          [applicationId],
        );
      });

      return NextResponse.json({ screening_status: "completed", match });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Screening AI gagal diproses.";
      await query(
        `UPDATE applications SET screening_status = 'failed', screening_step = 0, screening_error = $2
         WHERE id = $1 AND screening_status = 'processing'`,
        [applicationId, message.slice(0, 500)],
      );
      return NextResponse.json({ error: message }, { status: 422 });
    }
  } catch {
    return NextResponse.json({ error: "Screening gagal dijalankan. Periksa koneksi database." }, { status: 503 });
  }
}
