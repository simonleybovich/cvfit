"use client";

import { FileCheck2, Loader2, TriangleAlert, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GenerateCvPanel } from "@/components/generate/generate-cv-panel";

import type { AnalysisResult } from "@/domain/cv-analysis/types";
import {
  MAX_CV_FILE_SIZE_BYTES,
  MIN_JOB_DESCRIPTION_LENGTH,
  resolveCvFileKind,
  validateCvFileSize,
} from "@/domain/cv-analysis/validation";

import { AnalysisResults } from "./analysis-results";

const MAX_FILE_SIZE_MB = MAX_CV_FILE_SIZE_BYTES / (1024 * 1024);

type SubmitState = "idle" | "loading" | "error";

export function AnalyzeForm() {
  const fileInputId = useId();
  const jobDescriptionId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setResult(null);
    setSubmitError(null);

    if (!file) {
      setSelectedFile(null);
      setFileError(null);
      return;
    }

    try {
      resolveCvFileKind(file.name, file.type);
      validateCvFileSize(file.size);
      setSelectedFile(file);
      setFileError(null);
    } catch (error) {
      setSelectedFile(null);
      setFileError(error instanceof Error ? error.message : "Archivo inválido.");
      event.target.value = "";
    }
  }

  const canSubmit =
    selectedFile !== null &&
    jobDescription.trim().length >= MIN_JOB_DESCRIPTION_LENGTH &&
    submitState !== "loading";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) return;

    setSubmitState("loading");
    setSubmitError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("cvFile", selectedFile);
      formData.append("jobDescription", jobDescription);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "No pudimos completar el análisis. Intentá de nuevo.";
        setSubmitError(message);
        setSubmitState("error");
        return;
      }

      setResult(data as AnalysisResult);
      setSubmitState("idle");
    } catch {
      setSubmitError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      setSubmitState("error");
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader>
          <CardTitle>Analizá tu CV</CardTitle>
          <CardDescription>
            Subí tu CV y pegá la descripción del puesto. Tu archivo se procesa en memoria para este
            análisis y no queda guardado en el servidor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fileInputId}>CV (PDF o DOCX, máx. {MAX_FILE_SIZE_MB}MB)</Label>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload data-icon="inline-start" />
                  Elegir archivo
                </Button>
                {selectedFile ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileCheck2 className="size-4 text-emerald-600" />
                    {selectedFile.name}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Ningún archivo seleccionado</span>
                )}
              </div>
              {fileError && (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <TriangleAlert className="size-4" />
                  {fileError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={jobDescriptionId}>Descripción del puesto</Label>
              <Textarea
                id={jobDescriptionId}
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                placeholder="Pegá acá el texto completo de la publicación del puesto..."
                className="min-h-40"
                required
              />
            </div>

            {submitError && (
              <Alert variant="destructive">
                <TriangleAlert />
                <AlertTitle>No pudimos completar el análisis</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={!canSubmit} className="self-start">
              {submitState === "loading" ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Analizando tu CV...
                </>
              ) : (
                "Analizar compatibilidad"
              )}
            </Button>
            {submitState === "loading" && (
              <p className="text-sm text-muted-foreground">
                Esto puede tardar unos segundos mientras Gemini analiza tu CV contra la descripción del
                puesto.
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {result && <AnalysisResults result={result} />}

      {result && selectedFile && (
        <GenerateCvPanel cvFile={selectedFile} jobDescription={jobDescription} analysis={result} />
      )}
    </div>
  );
}
