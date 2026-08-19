/*
  Warnings:

  - Added the required column `analysisResult` to the `AnalysisHistory` table without a default value. This is not possible if the table is not empty.

  Hand-edited (spec.md section 5 deviation note): the local dev DB had one
  pre-existing row from earlier manual testing, saved back when historial only
  stored `matchScore`. Backfill it with a placeholder AnalysisResult JSON
  (built from that row's own matchScore, matching the shape parseAnalysisResult
  expects) before enforcing NOT NULL, instead of failing the migration or
  dropping real (if minimal) data.
*/
-- AlterTable
ALTER TABLE "AnalysisHistory" ADD COLUMN     "analysisResult" JSONB;

-- Backfill pre-existing rows with a placeholder AnalysisResult shape derived
-- from the row's own matchScore column.
UPDATE "AnalysisHistory"
SET "analysisResult" = jsonb_build_object(
  'matchScore', "matchScore",
  'matchScoreExplanation', 'Análisis guardado antes de que el historial almacenara el detalle completo.',
  'keywordsFound', '[]'::jsonb,
  'keywordsMissing', '[]'::jsonb,
  'suggestions', '[]'::jsonb
)
WHERE "analysisResult" IS NULL;

ALTER TABLE "AnalysisHistory" ALTER COLUMN "analysisResult" SET NOT NULL;
