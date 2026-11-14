const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/gi, "[REDACTED]"],
  [/(?:\+62|62|0)8\d{7,11}/g, "[REDACTED]"],
  [
    /\b(?:Nama(?:\s+Lengkap)?|Name)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Nama: [REDACTED]",
  ],
  [/\b(?:Umur|Usia)\s*:?\s*\d{1,3}\s*(?:tahun|th)?/gi, "Umur: [REDACTED]"],
  [
    /\b(?:Tanggal Lahir|Tempat,?\s*Tanggal Lahir|TTL|Date of Birth|DOB)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Tanggal Lahir: [REDACTED]",
  ],
  [/\b(?:Alamat|Address)\s*:\s*(?!\[REDACTED\])[^\n;]+/gi, "Alamat: [REDACTED]"],
  [
    /\b(?:Gender|Jenis Kelamin)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Gender: [REDACTED]",
  ],
  [
    /\b(?:Universitas|University|Politeknik|Institut|Sekolah|Lulusan)\s+(?!\[REDACTED\])[^\n,;]+/gi,
    "[REDACTED]",
  ],
];

export function redactPii(text: string): string {
  return PII_PATTERNS.reduce(
    (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
    text,
  );
}

export function containsCvSignals(text: string): boolean {
  const normalized = text.toLowerCase();
  const signals = [
    "pengalaman",
    "pendidikan",
    "skill",
    "keahlian",
    "riwayat",
    "curriculum vitae",
    "resume",
    "proyek",
    "project",
    "magang",
    "internship",
    "pekerjaan",
  ];

  return signals.filter((signal) => normalized.includes(signal)).length >= 2;
}
