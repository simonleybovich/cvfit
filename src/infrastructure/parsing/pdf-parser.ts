import { PDFParse } from "pdf-parse";

import { CvParsingError } from "@/domain/cv-analysis/errors";

/** Extracts plain text from an in-memory PDF buffer. */
export async function parsePdfBuffer(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } catch (error) {
    console.error("[pdf-parser] raw parse error:", error);
    throw new CvParsingError(
      "No pudimos leer el PDF. Verificá que no esté dañado o protegido con contraseña.",
      { cause: error },
    );
  } finally {
    await parser.destroy();
  }
}
