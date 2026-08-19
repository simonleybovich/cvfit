"use client";

import { ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AnalysisResults } from "@/components/analyze/analysis-results";
import { CvExportButtons } from "@/components/generate/cv-export-buttons";
import { GeneratedCvResults } from "@/components/generate/generated-cv-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { AnalysisHistoryEntry } from "@/domain/history/types";

import { ReuseJdButton } from "./reuse-jd-button";

const JD_SNIPPET_LENGTH = 140;

interface HistoryEntryCardProps {
  entry: AnalysisHistoryEntry;
}

/**
 * One saved historial entry, with the full stored AnalysisResult behind a
 * toggle and — when the user generated one before saving — the stored
 * GeneratedCv behind its own toggle, downloadable again via the same
 * deterministic /api/generate/export endpoint. Neither re-calls Gemini.
 */
export function HistoryEntryCard({ entry }: HistoryEntryCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showGeneratedCv, setShowGeneratedCv] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("¿Borrar esta entrada del historial? No se puede deshacer.")) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/history/${entry.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setDeleteError(
          data && typeof data === "object" && "error" in data && typeof data.error === "string"
            ? data.error
            : "No pudimos borrar esta entrada. Intentá de nuevo.",
        );
        setDeleting(false);
        return;
      }
      router.refresh();
    } catch {
      setDeleteError("No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          {/* suppressHydrationWarning: Node's and the browser's Intl ICU data can format
              "p. m." with a different invisible space character — same text, false mismatch. */}
          <CardTitle suppressHydrationWarning>{formatDate(entry.createdAt)}</CardTitle>
          <CardDescription>{jdSnippet(entry.jobDescription)}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{entry.analysisResult.matchScore}%</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Borrar esta entrada"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
        <div className="flex flex-wrap gap-2">
          <ReuseJdButton jobDescription={entry.jobDescription} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? <ChevronUp data-icon="inline-start" /> : <ChevronDown data-icon="inline-start" />}
            {expanded ? "Ocultar análisis completo" : "Ver análisis completo"}
          </Button>
          {entry.generatedCv && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={showGeneratedCv}
              onClick={() => setShowGeneratedCv((value) => !value)}
            >
              {showGeneratedCv ? <ChevronUp data-icon="inline-start" /> : <ChevronDown data-icon="inline-start" />}
              {showGeneratedCv ? "Ocultar CV optimizado" : "Ver CV optimizado"}
            </Button>
          )}
        </div>
        {expanded && <AnalysisResults result={entry.analysisResult} />}
        {showGeneratedCv && entry.generatedCv && (
          <div className="flex flex-col gap-4">
            <CvExportButtons cv={entry.generatedCv} />
            <GeneratedCvResults result={entry.generatedCv} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function jdSnippet(jobDescription: string): string {
  return jobDescription.length > JD_SNIPPET_LENGTH
    ? `${jobDescription.slice(0, JD_SNIPPET_LENGTH)}…`
    : jobDescription;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
