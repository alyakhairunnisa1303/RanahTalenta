import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import {
  calculateSemanticMatch,
  checkJobScam,
  validateAndRedactCV,
} from "../src/lib/scoring";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2];
    if (!key || rawValue === undefined || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue
      .replace(/\s+#.*$/, "")
      .replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.GEMINI_API_KEY?.trim() && !process.env.MOCK_AI) {
  process.env.MOCK_AI = "1";
  console.log("No GEMINI_API_KEY found; running deterministic mock mode.");
}

async function run(): Promise<void> {
  console.log(`Mode: ${process.env.MOCK_AI ? "mock" : "live Gemini"}\n`);

  const safeJob = await checkJobScam(
    "Backend Engineer",
    "Gaji Rp 8-12 juta. Tidak dipungut biaya. Kerja di kantor.",
  );
  assert.equal(typeof safeJob, "object");
  assert.equal(safeJob.is_safe, true, "safe job should be marked safe");
  assert.ok(safeJob.reason.length > 0, "reason should not be empty");
  console.log("Scam check (safe):", safeJob);

  const scamJob = await checkJobScam(
    "Admin Online",
    "Gaji 50 juta. Wajib bayar biaya pelatihan dan deposit. Tanpa wawancara.",
  );
  assert.equal(scamJob.is_safe, false, "scam job should be flagged");
  assert.ok(scamJob.reason.length > 0);
  console.log("Scam check (scam):", scamJob);

  const rawCv = [
    "Nama: Budi Santoso",
    "Umur: 22 tahun",
    "Email: budi@example.com",
    "No HP: 081234567890",
    "Lulusan PNP Padang",
    "Pengalaman: membuat REST API menggunakan PHP Laravel dan database MySQL.",
    "Skill: PHP, MySQL, Git",
  ].join("\n");

  const validCv = await validateAndRedactCV(rawCv);
  assert.equal(typeof validCv, "object");
  assert.equal(validCv.is_valid_cv, true, "real CV should pass validation");
  assert.equal(validCv.reject_reason, null);
  assert.ok(validCv.redacted_cv.includes("[REDACTED]"));
  assert.ok(!validCv.redacted_cv.includes("Budi Santoso"));
  assert.ok(!validCv.redacted_cv.includes("budi@example.com"));
  assert.ok(!validCv.redacted_cv.includes("081234567890"));
  assert.ok(!validCv.redacted_cv.includes("PNP"));
  assert.ok(
    validCv.redacted_cv.includes("Laravel") &&
      validCv.redacted_cv.includes("MySQL"),
    "skills must be preserved",
  );
  console.log("CV validation (valid):", validCv);

  const invalidCv = await validateAndRedactCV(
    "Struk belanja: Indomie 2x, sabun 1x. Total Rp 15.000.",
  );
  assert.equal(invalidCv.is_valid_cv, false, "non-CV should be rejected");
  assert.ok(invalidCv.reject_reason, "reject reason should be present");
  console.log("CV validation (invalid):", invalidCv);

  const jobDescription =
    "Dicari Backend Engineer yang menguasai pengembangan web service dan manajemen basis data relasional.";

  const directCv =
    "Backend Engineer dengan pengalaman REST API, web service, PHP Laravel, dan MySQL.";
  const directMatch = await calculateSemanticMatch(directCv, jobDescription);
  assert.equal(typeof directMatch, "object");
  assert.ok(
    directMatch.match_score >= 80,
    `expected direct match >= 80, got ${directMatch.match_score}`,
  );
  assert.equal(directMatch.match_category, "Highly Recommended");
  assert.equal(directMatch.interview_questions.length, 3);
  console.log("Semantic match (direct):", directMatch);

  const synonymCv =
    "PHP Laravel dan MySQL. Berpengalaman membangun REST API serta mengelola basis data relasional.";
  const synonymMatch = await calculateSemanticMatch(synonymCv, jobDescription);
  assert.ok(
    synonymMatch.match_score >= 80,
    `expected synonym match >= 80, got ${synonymMatch.match_score}`,
  );
  assert.equal(synonymMatch.match_category, "Highly Recommended");
  console.log("Semantic match (synonyms):", synonymMatch);

  const partialCv =
    "Backend Engineer dengan pengalaman REST API. Fokus pada pengembangan antarmuka pengguna.";
  const partialMatch = await calculateSemanticMatch(partialCv, jobDescription);
  assert.ok(
    partialMatch.match_score < directMatch.match_score,
    "partial match should score below direct match",
  );
  console.log("Semantic match (partial):", partialMatch);

  const unrelatedCv =
    "Desainer grafis. Menguasai Photoshop, Illustrator, dan Figma untuk branding.";
  const unrelatedMatch = await calculateSemanticMatch(
    unrelatedCv,
    jobDescription,
  );
  assert.equal(typeof unrelatedMatch, "object");
  assert.ok(
    unrelatedMatch.match_score < 55,
    `expected unrelated match < 55, got ${unrelatedMatch.match_score}`,
  );
  assert.equal(unrelatedMatch.match_category, "Not Recommended");
  console.log("Semantic match (unrelated):", unrelatedMatch);

  console.log("\nAll scoring checks passed.");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
