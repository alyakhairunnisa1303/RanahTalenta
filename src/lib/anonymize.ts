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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAll(text: string, pattern: RegExp, replacement: string) {
  return text.replace(pattern, replacement);
}

export function anonymize(text: string, name: string): string {
  let result = text;

  result = replaceAll(
    result,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[EMAIL]",
  );
  result = replaceAll(result, /\b\d{16}\b/g, "[NIK]");
  result = replaceAll(
    result,
    /(?:\+?62|0)\s?8(?:[\s.-]?\d){7,12}\b/g,
    "[TELEPON]",
  );

  result = replaceAll(
    result,
    /^\s*(?:tempat\s*,\s*)?(?:tanggal\s*lahir|ttl|tempat\s+lahir)\s*[:\-][^\n]*$/gim,
    "[TANGGAL_LAHIR]",
  );
  result = replaceAll(
    result,
    /\b(?:0?[1-9]|[12]\d|3[01])[\/.-](?:0?[1-9]|1[0-2])[\/.-](?:19|20)\d{2}\b/g,
    "[TANGGAL]",
  );
  result = replaceAll(
    result,
    /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
    "[TANGGAL]",
  );
  result = replaceAll(
    result,
    /\b(?:0?[1-9]|[12]\d|3[01])\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(?:19|20)\d{2}\b/gi,
    "[TANGGAL]",
  );

  result = replaceAll(
    result,
    /\b(?:usia|umur)\s*[:\-]?\s*\d{1,2}\s*(?:tahun|thn|th)?\b/gi,
    "[USIA]",
  );
  result = replaceAll(
    result,
    /\b(?:jenis\s*kelamin|gender)\s*[:\-]?\s*(?:laki-laki|perempuan|pria|wanita|male|female)\b/gi,
    "[GENDER]",
  );
  result = replaceAll(
    result,
    /\b(?:status\s*(?:pernikahan|kawin)|marital\s*status)\s*[:\-]?\s*(?:belum\s*kawin|kawin|menikah|cerai(?:\s*(?:hidup|mati))?|single|married)\b/gi,
    "[STATUS_PERKAWINAN]",
  );
  result = replaceAll(
    result,
    /\b(?:belum\s+kawin|menikah|cerai\s+hidup|cerai\s+mati)\b/gi,
    "[STATUS_PERKAWINAN]",
  );
  result = replaceAll(
    result,
    /\b(?:agama|religion)\s*[:\-]?\s*(?:islam|kristen|katolik|protestan|hindu|buddha|buddhis|konghucu|other)\b/gi,
    "[AGAMA]",
  );
  result = replaceAll(
    result,
    /\b(?:islam|kristen|katolik|protestan|hindu|buddha|buddhis|konghucu)\b/gi,
    "[AGAMA]",
  );

  result = replaceAll(
    result,
    /^\s*(?:alamat|address|domisili)\s*[:\-][^\n]*$/gim,
    "[ALAMAT]",
  );
  result = replaceAll(
    result,
    /^\s*almamater\s*[:\-][^\n]*$/gim,
    "[ALMAMATER]",
  );
  result = replaceAll(
    result,
    /\b(?:universitas|univ\.?|institut|politeknik|sekolah\s+tinggi|stmik|stie|sma|smk|smak|ma)\b[^\n,;|]{0,100}/gi,
    "[ALMAMATER]",
  );

  const nameParts = [name.trim(), ...name.trim().split(/\s+/)]
    .filter((part) => part.length >= 3)
    .sort((a, b) => b.length - a.length);

  for (const part of new Set(nameParts)) {
    const pattern = new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi");
    result = result.replace(pattern, "[NAMA]");
  }

  return result;
}

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
    anonymize(withoutHeaderName, ""),
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
