import { EmptyJobDescriptionError, InvalidFileTypeError, FileTooLargeError, CvParsingError } from "./errors";

export const MAX_CV_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const ACCEPTED_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
} as const;

export type CvFileKind = (typeof ACCEPTED_MIME_TYPES)[keyof typeof ACCEPTED_MIME_TYPES];

const ACCEPTED_FILE_EXTENSIONS: Record<string, CvFileKind> = {
  ".pdf": "pdf",
  ".docx": "docx",
};

export const MIN_JOB_DESCRIPTION_LENGTH = 30;
export const MAX_JOB_DESCRIPTION_LENGTH = 10_000;
export const MAX_CV_TEXT_LENGTH = 20_000;
const MIN_EXTRACTED_CV_TEXT_LENGTH = 30;

/**
 * Resolves the CV file kind from its declared MIME type, falling back to the
 * file extension. Browsers are inconsistent about the MIME type they report
 * for .docx uploads, so the extension fallback avoids rejecting valid files.
 */
export function resolveCvFileKind(fileName: string, mimeType: string): CvFileKind {
  if (mimeType in ACCEPTED_MIME_TYPES) {
    return ACCEPTED_MIME_TYPES[mimeType as keyof typeof ACCEPTED_MIME_TYPES];
  }

  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
  const kindByExtension = ACCEPTED_FILE_EXTENSIONS[extension];
  if (kindByExtension) {
    return kindByExtension;
  }

  throw new InvalidFileTypeError("Formato de archivo no soportado. Subí tu CV en PDF o DOCX.");
}

export function validateCvFileSize(sizeBytes: number): void {
  if (sizeBytes <= 0) {
    throw new InvalidFileTypeError("El archivo está vacío.");
  }
  if (sizeBytes > MAX_CV_FILE_SIZE_BYTES) {
    const maxMb = MAX_CV_FILE_SIZE_BYTES / (1024 * 1024);
    throw new FileTooLargeError(`El archivo supera el tamaño máximo permitido (${maxMb}MB).`);
  }
}

/** Validates and normalizes the pasted job description text. */
export function validateJobDescription(jobDescription: string): string {
  const trimmed = jobDescription.trim();
  if (trimmed.length < MIN_JOB_DESCRIPTION_LENGTH) {
    throw new EmptyJobDescriptionError(
      "Pegá la descripción completa del puesto (al menos unas líneas) para poder analizarla.",
    );
  }
  return trimmed.slice(0, MAX_JOB_DESCRIPTION_LENGTH);
}

/** Validates text extracted from an uploaded CV file. */
export function validateExtractedCvText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < MIN_EXTRACTED_CV_TEXT_LENGTH) {
    throw new CvParsingError(
      "No pudimos extraer texto legible de tu CV. Probá con otro archivo o exportalo nuevamente en PDF o DOCX.",
    );
  }
  return trimmed.slice(0, MAX_CV_TEXT_LENGTH);
}
