import type { Prisma } from "@prisma/client";

import { parseAnalysisResult } from "@/domain/cv-analysis/parse-analysis-result";
import type { AnalysisResult } from "@/domain/cv-analysis/types";
import { parseGeneratedCvResult } from "@/domain/cv-generation/parse-generation-result";
import type { GeneratedCv } from "@/domain/cv-generation/types";
import type { AnalysisHistoryEntry } from "@/domain/history/types";

import { prisma } from "./prisma-client";

export interface SaveAnalysisHistoryRecord {
  userId: string;
  jobDescription: string;
  analysisResult: AnalysisResult;
  generatedCv?: GeneratedCv;
}

export async function saveAnalysisHistoryEntry(
  record: SaveAnalysisHistoryRecord,
): Promise<AnalysisHistoryEntry> {
  const created = await prisma.analysisHistory.create({
    data: {
      userId: record.userId,
      jobDescription: record.jobDescription,
      // Kept as its own column (see prisma/schema.prisma note) even though
      // it's also inside analysisResult below.
      matchScore: record.analysisResult.matchScore,
      analysisResult: record.analysisResult as unknown as Prisma.InputJsonValue,
      // Omitted (left undefined) when there's no generated CV yet, which
      // Prisma stores as NULL — the column is nullable for exactly this case.
      generatedCv: record.generatedCv
        ? (record.generatedCv as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
  return toAnalysisHistoryEntry(created);
}

/** Most recent first — no pagination for this phase per spec.md section 5. */
export async function listAnalysisHistoryEntries(userId: string): Promise<AnalysisHistoryEntry[]> {
  const rows = await prisma.analysisHistory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAnalysisHistoryEntry);
}

/**
 * Scoped by userId in the query itself (not a separate ownership check) —
 * deleting someone else's entry id just matches zero rows, same as a
 * nonexistent id. Returns whether a row was actually deleted.
 */
export async function deleteAnalysisHistoryEntry(userId: string, entryId: string): Promise<boolean> {
  const { count } = await prisma.analysisHistory.deleteMany({
    where: { id: entryId, userId },
  });
  return count > 0;
}

function toAnalysisHistoryEntry(row: {
  id: string;
  jobDescription: string;
  analysisResult: Prisma.JsonValue;
  generatedCv: Prisma.JsonValue | null;
  createdAt: Date;
}): AnalysisHistoryEntry {
  return {
    id: row.id,
    jobDescription: row.jobDescription,
    // A stored jsonb blob is re-validated exactly like a fresh Gemini
    // response (see parse-analysis-result.ts) — external/persisted data
    // isn't trusted blindly either. Same for generatedCv below.
    analysisResult: parseAnalysisResult(row.analysisResult),
    generatedCv: row.generatedCv !== null ? parseGeneratedCvResult(row.generatedCv) : undefined,
    createdAt: row.createdAt,
  };
}
