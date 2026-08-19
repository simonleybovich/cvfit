"use client";

import { Download, Loader2, TriangleAlert, Wand2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { AnalysisResult } from "@/domain/cv-analysis/types";
import type { GeneratedCv } from "@/domain/cv-generation/types";

import { GeneratedCvResults } from "./generated-cv-results";

interface GenerateCvPanelProps {
  cvFile: File;
  jobDescription: string;
  analysis: AnalysisResult;
}

type GenerateState = "idle" | "loading" | "error";
type ExportFormat = "docx" | "pdf" | "typst";
type ExportState = "idle" | "loading" | "error";

const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  docx: "DOCX",
  pdf: "PDF",
  typst: "Typst",
};

const EXPORT_FORMAT_EXTENSION: Record<ExportFormat, string> = {
  docx: "docx",
  pdf: "pdf",
  typst: "typ",
};

export function GenerateCvPanel({ cvFile, jobDescription, analysis }: GenerateCvPanelProps) {
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneratedCv | null>(null);

  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

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

      setResult(data as GeneratedCv);
      setGenerateState("idle");
    } catch {
      setGenerateError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      setGenerateState("error");
    }
  }

  async function handleDownload(format: ExportFormat) {
    if (!result) return;

    setExportState("loading");
    setExportFormat(format);
    setExportError(null);

    try {
      const cv = {
        header: result.header,
        summary: result.summary,
        experience: result.experience,
        skills: result.skills,
        education: result.education,
        languages: result.languages,
      };
      const response = await fetch("/api/generate/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv, format }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : `No pudimos generar el archivo ${EXPORT_FORMAT_LABEL[format]}. Intentá de nuevo.`;
        setExportError(message);
        setExportState("error");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cv-optimizado.${EXPORT_FORMAT_EXTENSION[format]}`;
      link.click();
      URL.revokeObjectURL(url);
      setExportState("idle");
    } catch {
      setExportError("No pudimos descargar el archivo. Revisá tu conexión e intentá de nuevo.");
      setExportState("error");
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
          <div className="flex flex-col items-start gap-3">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => handleDownload("docx")}
                disabled={exportState === "loading"}
              >
                {exportState === "loading" && exportFormat === "docx" ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Generando DOCX...
                  </>
                ) : (
                  <>
                    <Download data-icon="inline-start" />
                    Descargar DOCX
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload("pdf")}
                disabled={exportState === "loading"}
              >
                {exportState === "loading" && exportFormat === "pdf" ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download data-icon="inline-start" />
                    Descargar PDF
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload("typst")}
                disabled={exportState === "loading"}
              >
                {exportState === "loading" && exportFormat === "typst" ? (
                  <>
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                    Generando Typst...
                  </>
                ) : (
                  <>
                    <Download data-icon="inline-start" />
                    Descargar Typst
                  </>
                )}
              </Button>
            </div>
            {exportError && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>No pudimos descargar el archivo</AlertTitle>
                <AlertDescription>{exportError}</AlertDescription>
              </Alert>
            )}
          </div>
          <GeneratedCvResults result={result} />
        </>
      )}
    </div>
  );
}
