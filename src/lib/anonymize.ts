const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/gi, "[REDACTED]"],
  [/(?:\+62|62|0)8\d{7,11}/g, "[REDACTED]"],
  [
    /\b(?:Nama(?:\s+Lengkap)?|Name)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Nama: [REDACTED]",
  ],
  [/\b(?:Umur|Usia)\s*:?\s*\d{1,3}\s*(?:tahun|th)?/gi, "Umur: [REDACTED]"],
  [
    /\b(?:Tanggal Lahir|Tempat(?:\s*,\s*|\s+)Tanggal Lahir|Tempat Lahir|TTL|Date of Birth|DOB)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Tanggal Lahir: [REDACTED]",
  ],
  [/\b(?:Alamat|Address)\s*:\s*(?!\[REDACTED\])[^\n;]+/gi, "Alamat: [REDACTED]"],
  [
    /\b(?:Gender|Jenis Kelamin)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Gender: [REDACTED]",
  ],
  [
    /\b(?:Agama|Religion)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Agama: [REDACTED]",
  ],
  [
    /\b(?:Status(?:\s+Perkawinan)?|Marital Status)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi,
    "Status: [REDACTED]",
  ],
  [/\b(?:NIK|NPWP|Nomor Induk Karyawan)\s*:\s*(?!\[REDACTED\])[^\n,;]+/gi, "[REDACTED]"],
  [
    /\b(?:Universitas|University|Politeknik|Institut|Sekolah|Lulusan|Almamater|Kampus)\s+(?!\[REDACTED\])[^\n,;.]+/gi,
    "[REDACTED]",
  ],
  [
    /\b(?:LinkedIn|GitHub|Gitlab|Portfolio|Portofolio|Website|Blog)\s*:\s*(?!\[REDACTED\])[^\n]+/gi,
    "[REDACTED_LINK]",
  ],
  [
    /\b(?:https?:\/\/|www\.)(?:[^\s<>()]+)/gi,
    "[REDACTED_LINK]",
  ],
  [
    /\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)\/[^\s<>()]+/gi,
    "[REDACTED_LINK]",
  ],
];

function redactHeaderName(text: string): string {
  const lines = text.split("\n");
  let contentLines = 0;

  for (let index = 0; index < lines.length && contentLines < 3; index += 1) {
    const line = lines[index]?.trim() ?? "";
    if (!line) continue;
    contentLines += 1;

    if (/^(?:nama|name)\s*:/i.test(line)) continue;
    if (
      /\b(?:CV|Resume|Curriculum|Email|Phone|Telepon|Alamat|Address|Lulusan|Skill|Pengalaman|Experience|Engineer|Developer|Designer|Manager|Analyst|Consultant|Specialist|Intern|Staff)\b/i.test(
        line,
      )
    ) {
      continue;
    }

    if (/^[A-Z][a-zA-Z'.-]+(?:\s+[A-Z][a-zA-Z'.-]+){1,3}$/.test(line)) {
      lines[index] = "[REDACTED]";
      break;
    }
  }

  return lines.join("\n");
}

export function redactPii(text: string): string {
  const withoutHeaderName = redactHeaderName(text);

  return PII_PATTERNS.reduce(
    (redacted, [pattern, replacement]) => redacted.replace(pattern, replacement),
    withoutHeaderName,
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
    "lulusan",
    "experience",
    "education",
    "skills",
    "projects",
    "employment",
    "profile",
    "summary",
  ];

  const signalCount = signals.filter((signal) =>
    normalized.includes(signal),
  ).length;
  const hasCvHeader =
    /\b(?:nama|name|umur|usia|email|no\.?\s*hp|telepon|alamat|pendidikan|lulusan|skill|keahlian)\b/i.test(
      text,
    );

  return signalCount >= 2 || (signalCount >= 1 && hasCvHeader);
}
