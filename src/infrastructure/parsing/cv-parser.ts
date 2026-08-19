import type { CvFileKind } from "@/domain/cv-analysis/validation";

import { parseDocxBuffer } from "./docx-parser";
import { parsePdfBuffer } from "./pdf-parser";

/** Dispatches to the right parser based on the resolved CV file kind. */
export async function parseCvBuffer(buffer: Buffer, kind: CvFileKind): Promise<string> {
  return kind === "pdf" ? parsePdfBuffer(buffer) : parseDocxBuffer(buffer);
}
