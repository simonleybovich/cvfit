import { requestStructuredJson } from "@/infrastructure/ai/ai-client";
import { ANALYZE_OUTPUT_SCHEMA, buildAnalyzeSystemPrompt, buildAnalyzeUserPrompt } from "@/infrastructure/ai/prompts/analyze-prompt";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { parseCvBuffer } from "@/infrastructure/parsing/cv-parser";

import { parseAnalysisResult } from "@/domain/cv-analysis/parse-analysis-result";
import { sanitizeForPrompt } from "@/domain/cv-analysis/sanitize";
import type { AnalysisResult } from "@/domain/cv-analysis/types";
import { UnauthenticatedError } from "@/domain/cv-analysis/errors";
import {
  MAX_CV_TEXT_LENGTH,
  MAX_JOB_DESCRIPTION_LENGTH,
  resolveCvFileKind,
  validateCvFileSize,
  validateExtractedCvText,
  validateJobDescription,
} from "@/domain/cv-analysis/validation";

export interface AnalyzeCvInput {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  jobDescription: string;
}

/**
 * Orchestrates the feedback-only CV analysis flow: validate input, parse the
 * CV to plain text, sanitize both untrusted texts, call the AI provider with
 * a structured-output prompt, and re-validate the response shape before
 * handing it back to the route handler.
 */
export async function analyzeCvUseCase(input: AnalyzeCvInput): Promise<AnalysisResult> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError("Iniciá sesión para analizar tu CV.");
  }

  const fileKind = resolveCvFileKind(input.fileName, input.mimeType);
  validateCvFileSize(input.fileBuffer.byteLength);

  const jobDescription = validateJobDescription(input.jobDescription);

  const rawCvText = await parseCvBuffer(input.fileBuffer, fileKind);
  const cvText = validateExtractedCvText(rawCvText);

  const sanitizedCvText = sanitizeForPrompt(cvText, MAX_CV_TEXT_LENGTH);
  const sanitizedJobDescription = sanitizeForPrompt(jobDescription, MAX_JOB_DESCRIPTION_LENGTH);

  const rawResult = await requestStructuredJson({
    system: buildAnalyzeSystemPrompt(),
    userMessage: buildAnalyzeUserPrompt({
      cvText: sanitizedCvText,
      jobDescription: sanitizedJobDescription,
    }),
    jsonSchema: ANALYZE_OUTPUT_SCHEMA,
  });

  return parseAnalysisResult(rawResult);
}
