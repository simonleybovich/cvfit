/**
 * Generation-specific error taxonomy. AI-communication and CV-parsing
 * errors are generic to "talk to Gemini" / "parse a CV file" and already
 * live in cv-analysis/errors.ts — reused as-is (see generate-cv-usecase.ts).
 * This file only holds the one error unique to generation: the export
 * endpoint receiving a malformed `sections` payload from the client.
 */
export class InvalidExportPayloadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExportPayloadError";
  }
}
