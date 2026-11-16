const STOPWORDS = new Set([
  "dan",
  "atau",
  "yang",
  "untuk",
  "dengan",
  "dari",
  "pada",
  "dalam",
  "sebagai",
  "serta",
  "agar",
  "akan",
  "telah",
  "sudah",
  "adalah",
  "ini",
  "itu",
  "juga",
  "saya",
  "anda",
  "kami",
  "kita",
  "mereka",
  "minimal",
  "maksimal",
  "tahun",
  "bulan",
  "pengalaman",
  "kemampuan",
  "menguasai",
  "memahami",
  "terbiasa",
  "memiliki",
  "dapat",
  "mampu",
  "mahir",
  "baik",
  "kuat",
  "kerja",
  "tim",
  "lain",
  "lainnya",
  "secara",
  "the",
  "and",
  "or",
  "with",
  "for",
  "from",
  "in",
  "on",
  "at",
  "to",
  "of",
  "as",
  "is",
  "are",
  "be",
  "will",
  "can",
  "must",
  "have",
  "has",
  "this",
  "that",
  "experience",
  "skills",
  "skill",
  "work",
  "team",
  "minimum",
  "plus",
  "etc",
]);

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function extractKeywords(text: string, limit = 40): string[] {
  const matches = normalizeText(text).match(/[a-z0-9][a-z0-9+#._-]{2,}/g) ?? [];
  const seen = new Set<string>();
  const output: string[] = [];

  for (const match of matches) {
    const token = match.replace(/^[._-]+|[._-]+$/g, "");
    if (
      token.length < 3 ||
      token.length > 60 ||
      STOPWORDS.has(token) ||
      seen.has(token)
    ) {
      continue;
    }

    seen.add(token);
    output.push(token);

    if (output.length >= limit) {
      break;
    }
  }

  return output;
}

export function extractMustHave(requirements: string, limit = 12): string[] {
  return extractKeywords(requirements, limit);
}

export function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
