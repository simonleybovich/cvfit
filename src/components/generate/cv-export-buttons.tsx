"use client";

import { Download, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { CvDocumentData } from "@/domain/cv-generation/types";

type ExportFormat = "docx" | "pdf" | "typst";
type ExportState = "idle" | "loading" | "error";

const EXPORT_FORMATS: readonly ExportFormat[] = ["docx", "pdf", "typst"];

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

interface CvExportButtonsProps {
  cv: CvDocumentData;
}

/**
 * DOCX/PDF/Typst download buttons for a `CvDocumentData` payload — shared by
 * the fresh-generation panel and the historial re-download flow, both of
 * which hit the same deterministic, non-AI /api/generate/export endpoint.
 */
export function CvExportButtons({ cv }: CvExportButtonsProps) {
  const [exportState, setExportState] = useState<ExportState>("idle");
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleDownload(format: ExportFormat) {
    setExportState("loading");
    setExportFormat(format);
    setExportError(null);

    try {
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
    <div className="flex flex-col items-start gap-3">
      <div className="flex flex-wrap gap-3">
        {EXPORT_FORMATS.map((format) => (
          <Button
            key={format}
            type="button"
            variant={format === "docx" ? "default" : "outline"}
            onClick={() => handleDownload(format)}
            disabled={exportState === "loading"}
          >
            {exportState === "loading" && exportFormat === format ? (
              <>
                <Loader2 data-icon="inline-start" className="animate-spin" />
                Generando {EXPORT_FORMAT_LABEL[format]}...
              </>
            ) : (
              <>
                <Download data-icon="inline-start" />
                Descargar {EXPORT_FORMAT_LABEL[format]}
              </>
            )}
          </Button>
        ))}
      </div>
      {exportError && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>No pudimos descargar el archivo</AlertTitle>
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
