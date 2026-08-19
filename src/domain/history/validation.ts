import { AiServiceError } from "@/domain/cv-analysis/errors";
import { parseAnalysisResult } from "@/domain/cv-analysis/parse-analysis-result";
import type { AnalysisResult } from "@/domain/cv-analysis/types";
import { parseGeneratedCvResult } from "@/domain/cv-generation/parse-generation-result";
import type { GeneratedCv } from "@/domain/cv-generation/types";

import { InvalidHistoryInputError } from "./errors";

// Same cap as cv-analysis' MAX_JOB_DESCRIPTION_LENGTH — the JD already went
// through that limit once at analyze time; re-enforced here since this input
// arrives fresh from the client on the save request, not carried over server-side.
const MAX_JOB_DESCRIPTION_LENGTH = 10_000;

export interface ValidatedHistoryInput {
  jobDescription: string;
  analysisResult: AnalysisResult;
  generatedCv?: GeneratedCv;
}

/** Validates a save-history request body. Defense in depth, not the source of truth for scoring. */
export function validateHistoryInput(input: {
  jobDescription: unknown;
  analysisResult: unknown;
  generatedCv?: unknown;
}): ValidatedHistoryInput {
  if (typeof input.jobDescription !== "string" || input.jobDescription.trim().length === 0) {
    throw new InvalidHistoryInputError("Falta la descripción del puesto.");
  }

  // Reuses the same shape check applied to a fresh Gemini response — the
  // client re-sends the AnalysisResult it already received from
  // POST /api/analyze, so it must satisfy the exact same contract.
  let analysisResult: AnalysisResult;
  try {
    analysisResult = parseAnalysisResult(input.analysisResult);
  } catch (error) {
    if (error instanceof AiServiceError) {
      throw new InvalidHistoryInputError("El análisis a guardar tiene un formato inválido.");
    }
    throw error;
  }

  // generatedCv is optional — the user may save an analysis before ever
  // clicking "Generar CV optimizado". When present, it's re-sent by the
  // client from the same shape POST /api/generate already returned to it.
  let generatedCv: GeneratedCv | undefined;
  if (input.generatedCv !== undefined && input.generatedCv !== null) {
    try {
      generatedCv = parseGeneratedCvResult(input.generatedCv);
    } catch (error) {
      if (error instanceof AiServiceError) {
        throw new InvalidHistoryInputError("El CV generado a guardar tiene un formato inválido.");
      }
      throw error;
    }
  }

  return {
    jobDescription: input.jobDescription.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH),
    analysisResult,
    generatedCv,
  };
}
