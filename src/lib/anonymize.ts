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
