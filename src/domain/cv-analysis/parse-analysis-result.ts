import { AiServiceError } from "./errors";
import type { AnalysisResult, Suggestion } from "./types";

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isSuggestion(value: unknown): value is Suggestion {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isString(record.section) && isString(record.suggestion);
}

/**
 * Defensively re-validates the shape of the AI's response. The Gemini
 * request already enforces this JSON schema server-side (see
 * infrastructure/ai/gemini-client.ts), but an external service's output is
 * never trusted blindly — a schema drift or edge case here should fail
 * loudly with a clear error rather than crash the UI on an unexpected field
 * somewhere downstream.
 */
export function parseAnalysisResult(raw: unknown): AnalysisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new AiServiceError("La respuesta del análisis tiene un formato inesperado.");
  }

  const data = raw as Record<string, unknown>;

  const isValid =
    typeof data.matchScore === "number" &&
    Number.isFinite(data.matchScore) &&
    isString(data.matchScoreExplanation) &&
    isStringArray(data.keywordsFound) &&
    isStringArray(data.keywordsMissing) &&
    Array.isArray(data.suggestions) &&
    data.suggestions.every(isSuggestion);

  if (!isValid) {
    throw new AiServiceError("La respuesta del análisis tiene un formato inesperado.");
  }

  return {
    matchScore: Math.max(0, Math.min(100, Math.round(data.matchScore as number))),
    matchScoreExplanation: data.matchScoreExplanation as string,
    keywordsFound: data.keywordsFound as string[],
    keywordsMissing: data.keywordsMissing as string[],
    suggestions: data.suggestions as Suggestion[],
  };
}
