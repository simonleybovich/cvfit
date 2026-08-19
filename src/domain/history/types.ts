/**
 * Pure business types for the Fase 3 historial feature. Mirrors the
 * cv-analysis/cv-generation types.ts convention.
 *
 * Scope deviation (spec.md section 5): originally just JD + score + date;
 * widened at Simon's explicit request to the full AnalysisResult so a saved
 * entry can be revisited from /historial without re-calling Gemini, then
 * widened again to optionally also carry the GeneratedCv (the optimized CV
 * rewrite) for the same reason. Still never the CV file or its extracted
 * text (spec.md section 10, unchanged) — both AnalysisResult and GeneratedCv
 * are derived output, not the CV's raw content.
 */

import type { AnalysisResult } from "@/domain/cv-analysis/types";
import type { GeneratedCv } from "@/domain/cv-generation/types";

export interface AnalysisHistoryEntry {
  id: string;
  jobDescription: string;
  analysisResult: AnalysisResult;
  generatedCv?: GeneratedCv;
  createdAt: Date;
}

export interface SaveAnalysisHistoryInput {
  jobDescription: string;
  analysisResult: AnalysisResult;
  generatedCv?: GeneratedCv;
}
