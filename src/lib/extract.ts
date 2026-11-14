import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export type DocumentKind = "pdf" | "docx" | "text";

export interface ExtractResult {
  text: string;
  filename: string;
  mimeType: string;
  kind: DocumentKind;
  pageCount?: number;
  charCount: number;
}

export class DocumentExtractionError extends Error {
  constructor(
    message: string,
    readonly status = 422,
  ) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index + 1).toLowerCase();
}

export function detectDocumentKind(
  mimeType: string | undefined,
  filename: string,
): DocumentKind | null {
  const mime = mimeType?.toLowerCase().trim() ?? "";
  const extension = extensionOf(filename);

  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return "docx";
  }
  if (
    mime === "text/plain" ||
    mime.startsWith("text/") ||
    extension === "txt"
  ) {
    return "text";
  }

  return null;
}

export function isSupportedDocument(
  mimeType: string | undefined,
  filename: string,
): boolean {
  return detectDocumentKind(mimeType, filename) !== null;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

async function extractPdf(
  buffer: Buffer,
): Promise<{ text: string; pageCount: number }> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText({ pageJoiner: "\n" });
    return {
      text: normalizeExtractedText(result.text),
      pageCount: result.total,
    };
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeExtractedText(result.value);
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string | undefined,
  filename = "document",
): Promise<ExtractResult> {
  if (buffer.length === 0) {
    throw new DocumentExtractionError("File kosong.", 422);
  }

  if (buffer.length > MAX_DOCUMENT_BYTES) {
    throw new DocumentExtractionError(
      "Ukuran file melebihi batas 8 MB.",
      413,
    );
  }

  const resolvedMime = mimeType?.trim() || "application/octet-stream";
  const kind = detectDocumentKind(resolvedMime, filename);

  if (!kind) {
    throw new DocumentExtractionError(
      "Format file tidak didukung. Gunakan PDF, DOCX, atau TXT.",
      415,
    );
  }

  let text = "";
  let pageCount: number | undefined;

  try {
    if (kind === "pdf") {
      const result = await extractPdf(buffer);
      text = result.text;
      pageCount = result.pageCount;
    } else if (kind === "docx") {
      text = await extractDocx(buffer);
    } else {
      text = normalizeExtractedText(buffer.toString("utf8"));
    }
  } catch (error) {
    if (error instanceof DocumentExtractionError) throw error;
    throw new DocumentExtractionError(
      "Gagal mengekstrak teks dari dokumen.",
      422,
    );
  }

  if (!text) {
    throw new DocumentExtractionError(
      kind === "pdf"
        ? "PDF tidak mengandung teks yang bisa dibaca. Gunakan PDF berbasis teks, bukan hasil scan."
        : "Dokumen tidak mengandung teks yang bisa dibaca.",
      422,
    );
  }

  return {
    text,
    filename,
    mimeType: resolvedMime,
    kind,
    pageCount,
    charCount: text.length,
  };
}
