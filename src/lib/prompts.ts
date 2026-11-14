const JSON_ONLY =
  "Kembalikan HANYA JSON valid tanpa markdown dan tanpa penjelasan tambahan.";

export function buildScamCheckPrompt(
  jobTitle: string,
  jobDescription: string,
): string {
  return (
    "Anda adalah sistem keamanan portal kerja. Analisis lowongan berikut apakah terindikasi penipuan " +
    "(meminta biaya, gaji tidak masuk akal, judi online, atau skema ponzi).\n" +
    `Posisi: ${jobTitle}\nDeskripsi: ${jobDescription}\n` +
    `${JSON_ONLY} Struktur: {"is_safe": boolean, "reason": "string singkat"}`
  );
}

export function buildCvRedactionPrompt(rawCvText: string): string {
  return (
    "Anda adalah sistem Bias-Free HR. Lakukan 2 tugas pada teks berikut:\n" +
    "1. Tentukan apakah teks ini adalah CV/Resume yang sah (bukan struk, resep, atau teks acak).\n" +
    "2. Hapus/sensor seluruh Nama Lengkap, Gender, Usia/Tanggal Lahir, Alamat Lengkap, Nomor HP, Email, " +
    "dan Nama Universitas/Sekolah menjadi [REDACTED]. Pertahankan semua skill, pengalaman kerja, dan proyek.\n" +
    `Teks CV:\n${rawCvText}\n` +
    `${JSON_ONLY} Struktur: {"is_valid_cv": boolean, "redacted_cv": "string teks cv bersih", "reject_reason": "string atau null"}`
  );
}

export function buildSemanticMatchPrompt(
  cleanCvText: string,
  jobDescription: string,
): string {
  return (
    "Anda adalah mesin AI Rekrutmen 'HireMatch AI' berbasis analisis semantik dan bebas bias.\n" +
    "Bandingkan CV pelamar dengan Job Description berikut berdasarkan makna kompetensi " +
    "(bukan sekadar kata kunci persis).\n" +
    `Job Description:\n${jobDescription}\n\n` +
    `CV Pelamar:\n${cleanCvText}\n\n` +
    `${JSON_ONLY} Struktur persis:\n` +
    "{\n" +
    '  "match_score": <integer 0-100>,\n' +
    '  "match_category": "<Highly Recommended | Potential | Not Recommended>",\n' +
    '  "candidate_feedback": "<1-2 kalimat saran konstruktif untuk pelamar>",\n' +
    '  "hr_strengths": "<1 paragraf singkat kekuatan utama kandidat>",\n' +
    '  "hr_gaps": "<1 paragraf singkat kekurangan kandidat dibanding syarat>",\n' +
    '  "interview_questions": ["<pertanyaan 1>", "<pertanyaan 2>", "<pertanyaan 3>"]\n' +
    "}"
  );
}
