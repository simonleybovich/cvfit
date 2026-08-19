import { requestStructuredJson } from "@/infrastructure/ai/gemini-client";
import { buildRewriteSystemPrompt, buildRewriteUserPrompt, REWRITE_OUTPUT_SCHEMA } from "@/infrastructure/ai/prompts/rewrite-prompt";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { parseCvBuffer } from "@/infrastructure/parsing/cv-parser";

// File/JD validation, prompt sanitization, and the auth-required error are
// generic to "CV + JD in," not specific to the analysis flow — reused as-is
// rather than duplicated.
import { UnauthenticatedError } from "@/domain/cv-analysis/errors";
import { sanitizeForPrompt } from "@/domain/cv-analysis/sanitize";
import {
  MAX_CV_TEXT_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  resolveCvFileKind,
  validateCvFileSize,
  validateExtractedCvText,
  validateJobDescription,
} from "@/domain/cv-analysis/validation";
import { parseGeneratedCvResult } from "@/domain/cv-generation/parse-generation-result";
import { assertGeneratedCvIsCoherent } from "@/domain/cv-generation/rewrite-cv";
import type { GeneratedCv } from "@/domain/cv-generation/types";
import { sanitizePriorAnalysisKeywords } from "@/domain/cv-generation/validation";

// Generation output (multiple rewritten sections) runs longer than the
// analysis flow's fixed-shape JSON, so it gets more headroom.
const GENERATION_MAX_TOKENS = 8192;

export interface GenerateCvInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  jobDescription: string;
  /** Optional keywordsFound/keywordsMissing from a prior /api/analyze call, reused to avoid double reasoning. Untrusted client input like everything else here. */
  priorAnalysis?: {
    keywordsFound?: unknown;
    keywordsMissing?: unknown;
  } | null;
}

/**
 * Orchestrates the CV rewrite flow: validate input, parse the CV to plain
 * text, sanitize both untrusted texts (plus the optional prior-analysis
 * context), call Gemini with the rewrite prompt, and re-validate the
 * response shape and coherence before handing it back to the route handler.
 * Mirrors analyze-cv-usecase.ts's shape and error handling.
 */
export async function generateCvUseCase(input: GenerateCvInput): Promise<GeneratedCv> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError("Iniciá sesión para generar un CV optimizado.");
  }

  const fileKind = resolveCvFileKind(input.fileName, input.mimeType);
  validateCvFileSize(input.fileBuffer.byteLength);

  const jobDescription = validateJobDescription(input.jobDescription);

  const rawCvText = await parseCvBuffer(input.fileBuffer, fileKind);
  const cvText = validateExtractedCvText(rawCvText);

  const sanitizedCvText = sanitizeForPrompt(cvText, MAX_CV_TEXT_LENGTH);
  const sanitizedJobDescription = sanitizeForPrompt(jobDescription, MAX_JOB_DESCRIPTION_LENGTH);
  const priorAnalysisSummary = buildPriorAnalysisSummary(input.priorAnalysis);

  const rawResult = await requestStructuredJson({
    system: buildRewriteSystemPrompt(),
    userMessage: buildRewriteUserPrompt({
      cvText: sanitizedCvText,
      jobDescription: sanitizedJobDescription,
      priorAnalysisSummary,
    }),
    jsonSchema: REWRITE_OUTPUT_SCHEMA,
    maxTokens: GENERATION_MAX_TOKENS,
  });

  const parsed = parseGeneratedCvResult(rawResult);
  assertGeneratedCvIsCoherent(parsed);
  return parsed;
}

function buildPriorAnalysisSummary(priorAnalysis: GenerateCvInput["priorAnalysis"]): string | undefined {
  if (!priorAnalysis) return undefined;

  const keywordsFound = sanitizePriorAnalysisKeywords(priorAnalysis.keywordsFound);
  const keywordsMissing = sanitizePriorAnalysisKeywords(priorAnalysis.keywordsMissing);
  if (keywordsFound.length === 0 && keywordsMissing.length === 0) return undefined;

  const lines: string[] = [];
  if (keywordsFound.length > 0) {
    lines.push(`Keywords already found in the CV (from a prior analysis): ${keywordsFound.join(", ")}`);
  }
  if (keywordsMissing.length > 0) {
    lines.push(`Keywords missing from the CV (from a prior analysis): ${keywordsMissing.join(", ")}`);
  }
  return sanitizeForPrompt(lines.join("\n"), 4000);
}
