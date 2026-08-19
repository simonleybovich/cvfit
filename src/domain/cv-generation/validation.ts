/**
 * Generation-specific validation. File type/size and job-description
 * validation is generic to "CV + JD in" and already lives in
 * cv-analysis/validation.ts — reused as-is here rather than duplicated (see
 * generate-cv-usecase.ts). This file only holds the one thing unique to
 * generation: sanitizing the optional prior-analysis context the client
 * round-trips from a previous /api/analyze response.
 */

const MAX_PRIOR_KEYWORDS = 50;
const MAX_KEYWORD_LENGTH = 100;

/**
 * The prior analysis payload comes back from the client, not straight from
 * our own server memory, so it's treated as untrusted input like everything
 * else in the request: unknown shape, capped length and count.
 */
export function sanitizePriorAnalysisKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, MAX_KEYWORD_LENGTH))
    .filter((item) => item.length > 0)
    .slice(0, MAX_PRIOR_KEYWORDS);
}
