import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSemanticMatch, weightedMatchScore } from "./policy";
import type { SemanticMatchResult } from "../types/contract";

const defaultWeights = {
  skill_weight: 60,
  experience_weight: 30,
  education_weight: 10,
};

const scores = {
  skill_score: 100,
  experience_score: 50,
  education_score: 20,
  education_applicable: true,
};

test("menghitung skor dari bobot keterampilan, pengalaman, dan pendidikan", () => {
  assert.equal(weightedMatchScore(scores, defaultWeights), 77);
});

test("menormalkan bobot bila pendidikan tidak disyaratkan lowongan", () => {
  assert.equal(
    weightedMatchScore({ ...scores, education_applicable: false }, defaultWeights),
    83,
  );
});

test("tetap menghasilkan skor saat satu-satunya bobot aktif tidak berlaku", () => {
  assert.equal(
    weightedMatchScore(
      { ...scores, education_applicable: false },
      { skill_weight: 0, experience_weight: 0, education_weight: 100 },
    ),
    75,
  );
});

test("membatasi rekomendasi jika syarat must-have memiliki gap", () => {
  const match: SemanticMatchResult = {
    match_score: 92,
    match_category: "Highly Recommended",
    skill_score: 92,
    experience_score: 90,
    education_score: 80,
    education_applicable: true,
    confidence: 90,
    candidate_feedback: "Saran.",
    hr_strengths: "Kuat.",
    hr_gaps: "Ada syarat wajib yang belum terpenuhi.",
    interview_questions: [],
    matched_skills: [],
    missing_skills: [],
    must_have_gaps: ["Sertifikasi wajib"],
    evidence: [],
  };

  const normalized = normalizeSemanticMatch(match);
  assert.equal(normalized.match_score, 59);
  assert.equal(normalized.match_category, "Not Recommended");
});
