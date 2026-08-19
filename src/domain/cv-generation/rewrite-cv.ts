import { AiServiceError } from "@/domain/cv-analysis/errors";

import type { GeneratedCv } from "./types";

/**
 * Pure business-rule guard over an already shape-validated generation
 * result (wire-format shape checking happens in parse-generation-result.ts).
 * Catches output that is technically valid JSON but incoherent, e.g. no
 * name/experience/education at all — the kind of thing schema validation
 * alone won't catch.
 */
export function assertGeneratedCvIsCoherent(result: GeneratedCv): void {
  if (result.header.name.trim().length === 0) {
    throw new AiServiceError("La respuesta de generación no incluyó el nombre del candidato.");
  }

  if (result.experience.length === 0 && result.education.length === 0) {
    throw new AiServiceError("La respuesta de generación no incluyó experiencia ni educación.");
  }

  const hasEmptyChangeSection = result.changes.some((change) => change.section.trim().length === 0);
  if (hasEmptyChangeSection) {
    throw new AiServiceError("La respuesta de generación incluye un cambio sin referencia a una sección del CV.");
  }
}
