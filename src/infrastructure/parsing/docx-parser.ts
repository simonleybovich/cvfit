import mammoth from "mammoth";

import { CvParsingError } from "@/domain/cv-analysis/errors";

/** Extracts plain text from an in-memory DOCX buffer. */
export async function parseDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    throw new CvParsingError(
      "No pudimos leer el archivo DOCX. Verificá que no esté dañado.",
      { cause: error },
    );
  }
}
