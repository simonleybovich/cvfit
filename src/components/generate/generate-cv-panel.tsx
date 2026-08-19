"use client";

import { Loader2, TriangleAlert, Wand2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { AnalysisResult } from "@/domain/cv-analysis/types";
import type { GeneratedCv } from "@/domain/cv-generation/types";

import { CvExportButtons } from "./cv-export-buttons";
import { GeneratedCvResults } from "./generated-cv-results";

interface GenerateCvPanelProps {
  cvFile: File;
  jobDescription: string;
  analysis: AnalysisResult;
  /** Lets the parent (analyze-form.tsx) keep a copy for the "Guardar en mi historial" flow. */
  onGenerated?: (result: GeneratedCv) => void;
}

type GenerateState = "idle" | "loading" | "error";

export function GenerateCvPanel({ cvFile, jobDescription, analysis, onGenerated }: GenerateCvPanelProps) {
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedCv | null>(null);

  async function handleGenerate() {
    setGenerateState("loading");
    setGenerateError(null);

    try {
      const formData = new FormData();
      formData.append("cvFile", cvFile);
      formData.append("jobDescription", jobDescription);
      formData.append(
        "priorAnalysis",
        JSON.stringify({
          keywordsFound: analysis.keywordsFound,
          keywordsMissing: analysis.keywordsMissing,
        }),
      );

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "No pudimos generar el CV optimizado. Intentá de nuevo.";
        setGenerateError(message);
        setGenerateState("error");
        return;
      }

      const generated = data as GeneratedCv;
      setResult(generated);
      onGenerated?.(generated);
      setGenerateState("idle");
    } catch {
      setGenerateError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      setGenerateState("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {!result && (
        <div className="flex flex-col items-start gap-3">
          <Button type="button" onClick={handleGenerate} disabled={generateState === "loading"}>
            {generateState === "loading" ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Generando CV optimizado...
              </>
            ) : (
              <>
                <Wand2 data-icon="inline-start" />
                Generar CV optimizado
              </>
            )}
          </Button>
          {generateState === "loading" && (
            <p className="text-sm text-muted-foreground">
              Esto puede tardar unos segundos mientras Gemini reescribe tu CV.
            </p>
          )}
          {generateError && (
            <Alert variant="destructive">
              <TriangleAlert />
              <AlertTitle>No pudimos generar el CV optimizado</AlertTitle>
              <AlertDescription>{generateError}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {result && (
        <>
          <CvExportButtons cv={result} />
          <GeneratedCvResults result={result} />
        </>
      )}
    </div>
  );
}
