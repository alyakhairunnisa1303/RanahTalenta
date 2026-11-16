import assert from "node:assert/strict";
import test from "node:test";
import {
  checkJobScam,
  scoreCandidate,
  validateCv,
} from "./scoring.mock";

test("mock menandai frasa scam", () => {
  const result = checkJobScam(
    "Lowongan admin. Silakan transfer dulu biaya administrasi.",
  );
  assert.equal(result.is_safe, false);
  assert.match(result.reason ?? "", /scam/i);
  assert.equal(checkJobScam("Lowongan backend engineer.").is_safe, true);
});

test("mock memvalidasi panjang teks CV", () => {
  assert.equal(validateCv("a".repeat(201)).is_valid_cv, true);
  assert.equal(validateCv("a".repeat(200)).is_valid_cv, false);
});

test("mock deterministik dan selalu 3 pertanyaan", () => {
  const jd =
    "Backend Engineer. Membangun API dengan TypeScript, Node.js, PostgreSQL, dan Docker.";
  const cv =
    "Backend engineer dengan pengalaman TypeScript dan Node.js. Membangun REST API, testing, dan deployment Docker.";
  const mustHave = ["typescript", "node.js", "postgresql"];

  const first = scoreCandidate(jd, cv, mustHave);
  const second = scoreCandidate(jd, cv, mustHave);

  assert.deepEqual(first, second);
  assert.equal(first.pertanyaan_wawancara.length, 3);
  assert.equal(first.missing.includes("postgresql"), true);
  assert.ok(first.total >= 40 && first.total <= 95);
  assert.ok(first.sim >= 0 && first.sim <= 100);
  assert.ok(first.mustScore >= 0 && first.mustScore <= 100);
});
