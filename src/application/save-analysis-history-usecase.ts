import { UnauthenticatedError } from "@/domain/history/errors";
import type { AnalysisHistoryEntry } from "@/domain/history/types";
import { validateHistoryInput } from "@/domain/history/validation";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { saveAnalysisHistoryEntry } from "@/infrastructure/persistence/postgres/analysis-history-repository";

export interface SaveAnalysisHistoryUseCaseInput {
  jobDescription: unknown;
  analysisResult: unknown;
  generatedCv?: unknown;
}

/**
 * Explicit-save flow (spec.md section 10): only called when the signed-in
 * user clicks "Guardar en mi historial" — never automatically on analyze.
 * Authorization is just "verified Supabase user id === row's userId";
 * there's no Supabase RLS here since this data isn't in Supabase's database
 * (see spec.md section 6 auth note).
 */
export async function saveAnalysisHistoryUseCase(
  input: SaveAnalysisHistoryUseCaseInput,
): Promise<AnalysisHistoryEntry> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError("Iniciá sesión para guardar el análisis en tu historial.");
  }

  const { jobDescription, analysisResult, generatedCv } = validateHistoryInput(input);

  return saveAnalysisHistoryEntry({ userId: user.id, jobDescription, analysisResult, generatedCv });
}
