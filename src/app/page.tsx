import { ShieldCheck } from "lucide-react";

import { AnalyzeForm } from "@/components/analyze/analyze-form";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-4 text-center">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          ¿Qué tan bien matchea tu CV con esa vacante?
        </h1>
        <p className="text-balance text-muted-foreground sm:text-lg">
          Subí tu CV y pegá la descripción del puesto. En segundos vas a tener una estimación de
          compatibilidad, las keywords que te faltan y sugerencias concretas para mejorar tu CV
          antes de postularte.
        </p>
        <div className="mx-auto flex max-w-xl items-start gap-2 rounded-lg border bg-muted/40 p-3 text-left text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
          <p>
            Tu CV se procesa solo en memoria durante este análisis: no se guarda el archivo ni el
            texto extraído en el servidor, ni se persiste en ninguna base de datos.
          </p>
        </div>
      </header>

      <AnalyzeForm isSignedIn={user !== null} />

      <footer className="mt-4 flex flex-col items-center gap-4 text-center text-xs text-muted-foreground">
        <p>
          Los resultados son una estimación generada por IA, no un puntaje oficial de ningún
          sistema de reclutamiento (ATS).
        </p>
        <a href="https://cafecito.app/simonleybo" rel="noopener" target="_blank">
          {/* eslint-disable-next-line @next/next/no-img-element -- official cafecito.app embed badge */}
          <img
            srcSet="https://cdn.cafecito.app/imgs/buttons/button_5.png 1x, https://cdn.cafecito.app/imgs/buttons/button_5_2x.png 2x, https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png 3.75x"
            src="https://cdn.cafecito.app/imgs/buttons/button_5.png"
            alt="Invitame un café en cafecito.app"
          />
        </a>
      </footer>
    </main>
  );
}
