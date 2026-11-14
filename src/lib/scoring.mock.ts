import { dedupe, extractKeywords, normalizeText } from "./keywords";
import type {
  CvValidationResult,
  JobScamCheckResult,
  ScoreOutput,
} from "./types";

const SCAM_PHRASES = ["biaya administrasi", "transfer dulu", "bayar dulu"];
const QUESTION_FALLBACKS = [
  "pengalaman relevan",
  "kolaborasi tim",
  "pemecahan masalah",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPresent(keyword: string, cvText: string, cvTokens: Set<string>) {
  const normalized = normalizeText(keyword).trim();
  if (!normalized) {
    return false;
  }
  return normalized.includes(" ")
    ? normalizeText(cvText).includes(normalized)
    : cvTokens.has(normalized);
}

export function checkJobScam(text: string): JobScamCheckResult {
  const normalized = normalizeText(text);
  const phrase = SCAM_PHRASES.find((item) => normalized.includes(item));

  if (!phrase) {
    return { is_safe: true };
  }

  return {
    is_safe: false,
    reason: `Lowongan mengandung indikasi scam: "${phrase}".`,
  };
}

export function validateCv(text: string): CvValidationResult {
  const compact = text.replace(/\s+/g, " ").trim();

  if (compact.length > 200) {
    return { is_valid_cv: true };
  }

  return {
    is_valid_cv: false,
    reason:
      "Teks CV terlalu pendek. Unggah CV PDF yang memuat pengalaman dan keahlian.",
  };
}

export function scoreCandidate(
  jd: string,
  cvAnon: string,
  mustHave: string[],
): ScoreOutput {
  const jdKeywords = extractKeywords(jd, 50);
  const cvTokens = new Set(extractKeywords(cvAnon, 500));
  const required = dedupe(mustHave.map((item) => item.trim()).filter(Boolean));

  const matchedJd = jdKeywords.filter((keyword) =>
    isPresent(keyword, cvAnon, cvTokens),
  );
  const matchedMust = required.filter((keyword) =>
    isPresent(keyword, cvAnon, cvTokens),
  );
  const missing = required.filter(
    (keyword) => !isPresent(keyword, cvAnon, cvTokens),
  );

  const sim =
    jdKeywords.length > 0
      ? Math.round((matchedJd.length / jdKeywords.length) * 100)
      : 50;
  const mustScore =
    required.length > 0
      ? Math.round((matchedMust.length / required.length) * 100)
      : sim;
  const skorKompetensi = clamp(Math.round((sim + mustScore) / 2), 0, 100);
  const total = clamp(
    Math.round(sim * 0.4 + mustScore * 0.6),
    40,
    95,
  );

  const strengths = dedupe([...matchedMust, ...matchedJd])
    .slice(0, 5)
    .map((keyword) => ({
      poin: `Menguasai ${keyword}`,
      bukti: `Kata kunci "${keyword}" ditemukan di CV.`,
    }));

  if (strengths.length === 0) {
    strengths.push({
      poin: "CV dapat terbaca",
      bukti: "Teks CV berhasil diekstrak dan dianalisis.",
    });
  }

  const gaps = missing
    .slice(0, 5)
    .map((keyword) => `Belum ada bukti untuk "${keyword}" di CV.`);

  const focus = dedupe([
    ...missing,
    ...matchedMust,
    ...matchedJd,
    ...QUESTION_FALLBACKS,
  ]);

  const feedbackParts = [`Skor kecocokan CV Anda ${total}/100.`];
  if (missing.length > 0) {
    feedbackParts.push(
      `Perkuat CV dengan bukti untuk: ${missing.slice(0, 3).join(", ")}.`,
    );
  } else {
    feedbackParts.push("Semua must-have utama sudah terlihat di CV.");
  }
  feedbackParts.push(
    "Tambahkan pencapaian yang terukur agar profil lebih meyakinkan.",
  );

  return {
    total,
    sim,
    mustScore,
    skor_kompetensi: skorKompetensi,
    missing,
    kekuatan: strengths,
    celah: gaps,
    candidateFeedback: feedbackParts.join(" "),
    pertanyaan_wawancara: [
      `Ceritakan pengalaman Anda yang paling relevan dengan "${focus[0]}".`,
      `Bagaimana Anda membuktikan kemampuan "${focus[1]}" dalam proyek nyata?`,
      `Apa tantangan terbesar terkait "${focus[2]}", dan bagaimana Anda mengatasinya?`,
    ],
  };
}
