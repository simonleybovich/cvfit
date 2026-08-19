"use client";

import { Check, Save, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { AnalysisResult } from "@/domain/cv-analysis/types";
import type { GeneratedCv } from "@/domain/cv-generation/types";

interface SaveHistoryButtonProps {
  jobDescription: string;
  result: AnalysisResult;
  /** Included in the save request when the user already generated a CV rewrite for this analysis. */
  generatedCv?: GeneratedCv | null;
}

type SaveState = "idle" | "loading" | "saved" | "error";

/**
 * Explicit save action (spec.md section 10): history is never written just
 * because the user is logged in and ran an analysis — only when they click
 * this button. Only rendered for signed-in users (see analyze-form.tsx).
 */
export function SaveHistoryButton({ jobDescription, result, generatedCv }: SaveHistoryButtonProps) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, analysisResult: result, generatedCv: generatedCv ?? undefined }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "No pudimos guardar el análisis en tu historial.";
        setError(message);
        setState("error");
        return;
      }

      setState("saved");
    } catch {
      setError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      setState("error");
    }
  }

  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
        <Check className="size-4" />
        Guardado en tu historial
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type="button" variant="outline" size="sm" onClick={handleSave} disabled={state === "loading"}>
        <Save data-icon="inline-start" />
        {state === "loading" ? "Guardando..." : "Guardar en mi historial"}
      </Button>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <TriangleAlert className="size-4" />
          {error}
        </p>
      )}
    </div>
  );
}
