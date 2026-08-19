import { UnauthenticatedError } from "@/domain/history/errors";
import type { AnalysisHistoryEntry } from "@/domain/history/types";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { listAnalysisHistoryEntries } from "@/infrastructure/persistence/postgres/analysis-history-repository";

/** Lists the caller's own historial entries only, scoped by the verified Supabase user id. */
export async function listAnalysisHistoryUseCase(): Promise<AnalysisHistoryEntry[]> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError("Iniciá sesión para ver tu historial.");
  }

  return listAnalysisHistoryEntries(user.id);
}
