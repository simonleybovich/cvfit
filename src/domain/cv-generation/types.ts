/**
 * Pure business types for the CV rewrite/generation domain. Mirrors the
 * cv-analysis/types.ts convention: no external dependencies, shared between
 * server (use case) and client (results rendering) with zero risk of
 * pulling Node-only code into the browser bundle.
 *
 * Structured (not generic prose sections) so all three exporters (DOCX, PDF,
 * Typst) can populate typed fields — a Typst template with typed slots
 * (position/institution/date/...) cannot be cleanly filled from freeform
 * title+content blocks.
 */

export interface CvContact {
  text: string;
  link: string;
}

export interface CvHeader {
  name: string;
  address: string;
  contacts: CvContact[];
}

export interface CvJobEntry {
  position: string;
  institution: string;
  location: string;
  date: string;
  bullets: string[];
}

export interface CvSkillGroup {
  title: string;
  items: string[];
}

export interface CvEducationEntry {
  institution: string;
  major: string;
  date: string;
  location: string;
}

export interface CvLanguageEntry {
  title: string;
  level: string;
}

export type ChangeType = "added" | "reworded" | "reordered";

export interface ChangeLogEntry {
  /** Human-readable location label, e.g. "Resumen" or "Experiencia — Mobile Computing" (no generic section titles to reference anymore). */
  section: string;
  type: ChangeType;
  /** Keyword this change relates to, or null for changes not tied to a specific JD keyword (e.g. pure reordering). */
  keyword: string | null;
  description: string;
}

export interface SkippedKeyword {
  keyword: string;
  reason: string;
}

/** The rendering-relevant subset of GeneratedCv, shared by all three exporters and round-tripped by the client to /api/generate/export. */
export interface CvDocumentData {
  header: CvHeader;
  summary: string;
  experience: CvJobEntry[];
  skills: CvSkillGroup[];
  education: CvEducationEntry[];
  languages: CvLanguageEntry[];
}

export interface GeneratedCv extends CvDocumentData {
  changes: ChangeLogEntry[];
  keywordsSkipped: SkippedKeyword[];
}

/** Optional context from a prior /api/analyze call, reused to avoid double reasoning. */
export interface PriorAnalysisContext {
  keywordsFound: string[];
  keywordsMissing: string[];
}
