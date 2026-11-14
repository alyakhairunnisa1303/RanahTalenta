import { createRequire } from "node:module";
import path from "node:path";

type PdfParser = {
  getText(): Promise<{ text: string }>;
  destroy(): Promise<void>;
};

type PdfParseModule = {
  PDFParse: new (options: { data: Uint8Array }) => PdfParser;
};

const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));
let pdfParseModule: PdfParseModule | null = null;

function loadPdfParse(): PdfParseModule {
  if (!pdfParseModule) {
    pdfParseModule = nodeRequire("pdf-parse") as PdfParseModule;
  }
  return pdfParseModule;
}

export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MIN_CV_TEXT_CHARS = 50;

export function hasPdfMagicBytes(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const { PDFParse } = loadPdfParse();
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();
    return (result.text ?? "").trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}
