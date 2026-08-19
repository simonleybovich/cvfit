import { HistoryEntryNotFoundError, UnauthenticatedError } from "@/domain/history/errors";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { deleteAnalysisHistoryEntry } from "@/infrastructure/persistence/postgres/analysis-history-repository";

/** Deletes one of the caller's own historial entries, scoped by the verified Supabase user id. */
export async function deleteAnalysisHistoryUseCase(entryId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError("Iniciá sesión para borrar entradas de tu historial.");
  }

  const deleted = await deleteAnalysisHistoryEntry(user.id, entryId);
  if (!deleted) {
    throw new HistoryEntryNotFoundError("No encontramos esa entrada en tu historial.");
  }
}
