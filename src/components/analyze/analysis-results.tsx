import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import type { AnalysisResult } from "@/domain/cv-analysis/types";

import { ScoreRing } from "./score-ring";

interface AnalysisResultsProps {
  result: AnalysisResult;
}

export function AnalysisResults({ result }: AnalysisResultsProps) {
  const suggestionsBySection = groupSuggestionsBySection(result.suggestions);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Estimación de compatibilidad</CardTitle>
          <CardDescription>
            No es un puntaje real de ATS: los sistemas de reclutamiento reales no funcionan con una
            fórmula única. Es una estimación orientativa de Gemini para ayudarte a priorizar qué mejorar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <ScoreRing score={result.matchScore} />
          <p className="text-sm text-muted-foreground">{result.matchScoreExplanation}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Keywords presentes</CardTitle>
            <CardDescription>Ya aparecen en tu CV.</CardDescription>
          </CardHeader>
          <CardContent>
            {result.keywordsFound.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {result.keywordsFound.map((keyword) => (
                  <li key={keyword}>
                    <Badge variant="secondary">{keyword}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No se identificaron coincidencias claras.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keywords ausentes</CardTitle>
            <CardDescription>No aparecen en tu CV, ordenadas por importancia.</CardDescription>
          </CardHeader>
          <CardContent>
            {result.keywordsMissing.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {result.keywordsMissing.map((keyword) => (
                  <li key={keyword}>
                    <Badge variant="outline">{keyword}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No se detectaron keywords importantes faltantes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sugerencias por sección</CardTitle>
          <CardDescription>Recomendaciones concretas para mejorar el match.</CardDescription>
        </CardHeader>
        <CardContent>
          {suggestionsBySection.size > 0 ? (
            <div className="flex flex-col gap-4">
              {Array.from(suggestionsBySection.entries()).map(([section, suggestions]) => (
                <div key={section}>
                  <h3 className="mb-1.5 text-sm font-medium">{section}</h3>
                  <ul className="flex flex-col gap-1.5">
                    {suggestions.map((suggestion, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay sugerencias adicionales.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function groupSuggestionsBySection(
  suggestions: AnalysisResult["suggestions"],
): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const { section, suggestion } of suggestions) {
    const existing = grouped.get(section);
    if (existing) {
      existing.push(suggestion);
    } else {
      grouped.set(section, [suggestion]);
    }
  }
  return grouped;
}
