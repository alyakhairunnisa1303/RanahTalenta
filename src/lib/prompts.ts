const JSON_ONLY =
  "Kembalikan HANYA JSON valid tanpa markdown dan tanpa penjelasan tambahan.";

export function buildScamCheckPrompt(
  companyName: string,
  hrdEmail: string,
  jobTitle: string,
  jobDescription: string,
): string {
  return (
    "Anda adalah sistem keamanan anti-penipuan loker pada platform Alua.ai.\n" +
    "Analisis data lowongan berikut untuk mendeteksi indikasi penipuan (Fake Job / Scam):\n" +
    `- Nama Perusahaan: ${companyName}\n` +
    `- Email HRD: ${hrdEmail}\n` +
    `- Posisi: ${jobTitle}\n` +
    `- Deskripsi: ${jobDescription}\n\n` +
    "KRITERIA PENIPUAN (RED FLAGS):\n" +
    "1. Meminta transfer uang, biaya administrasi, atau pembelian tiket/akomodasi.\n" +
    "2. Gaji terlalu tinggi/tidak masuk akal untuk syarat yang sangat mudah (misal: hanya modal HP/mengetik).\n" +
    "3. Mengarahkan komunikasi keluar sistem ke nomor WhatsApp/Telegram pribadi.\n" +
    "4. Ketidaksesuaian ekstrem antara nama perusahaan besar dengan domain email yang mencurigakan.\n\n" +
    `${JSON_ONLY} Struktur persis:\n` +
    "{\n" +
    '  "is_safe": <boolean>,\n' +
    '  "risk_level": "<Low | Medium | High>",\n' +
    '  "reason": "<Penjelasan singkat alasan lolos atau ditolak>"\n' +
    "}"
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
