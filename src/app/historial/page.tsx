import { SignInMenu } from "@/components/auth/sign-in-menu";
import { HistoryEntryCard } from "@/components/history/history-entry-card";

import { listAnalysisHistoryUseCase } from "@/application/list-analysis-history-usecase";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";

export default async function HistorialPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Mi historial</h1>
        <p className="text-muted-foreground">
          Iniciá sesión para ver el historial de tus análisis guardados.
        </p>
        <SignInMenu />
      </main>
    );
  }

  const entries = await listAnalysisHistoryUseCase();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Mi historial</h1>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no guardaste ningún análisis. Analizá un CV y usá &quot;Guardar en mi
          historial&quot; sobre el resultado.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <HistoryEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}
