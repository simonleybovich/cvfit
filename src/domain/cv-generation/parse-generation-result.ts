import { AiServiceError } from "@/domain/cv-analysis/errors";

import { InvalidExportPayloadError } from "./errors";
import type {
  ChangeLogEntry,
  ChangeType,
  CvContact,
  CvDocumentData,
  CvEducationEntry,
  CvHeader,
  CvJobEntry,
  CvLanguageEntry,
  CvSkillGroup,
  GeneratedCv,
  SkippedKeyword,
} from "./types";

const CHANGE_TYPES: readonly ChangeType[] = ["added", "reworded", "reordered"];

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isCvContact(value: unknown): value is CvContact {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isString(record.text) && isString(record.link);
}

function isCvHeader(value: unknown): value is CvHeader {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isString(record.name) &&
    isString(record.address) &&
    Array.isArray(record.contacts) &&
    record.contacts.every(isCvContact)
  );
}

function isCvJobEntry(value: unknown): value is CvJobEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isString(record.position) &&
    isString(record.institution) &&
    isString(record.location) &&
    isString(record.date) &&
    isStringArray(record.bullets)
  );
}

function isCvSkillGroup(value: unknown): value is CvSkillGroup {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isString(record.title) && isStringArray(record.items);
}

function isCvEducationEntry(value: unknown): value is CvEducationEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isString(record.institution) && isString(record.major) && isString(record.date) && isString(record.location)
  );
}

function isCvLanguageEntry(value: unknown): value is CvLanguageEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isString(record.title) && isString(record.level);
}

function isChangeType(value: unknown): value is ChangeType {
  return typeof value === "string" && (CHANGE_TYPES as string[]).includes(value);
}

function isChangeLogEntry(value: unknown): value is ChangeLogEntry {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    isString(record.section) &&
    isChangeType(record.type) &&
    isNullableString(record.keyword) &&
    isString(record.description)
  );
}

function isSkippedKeyword(value: unknown): value is SkippedKeyword {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return isString(record.keyword) && isString(record.reason);
}

/** Shape-checks the rendering-relevant fields shared by the AI response and the export round-trip. */
function isCvDocumentData(record: Record<string, unknown>): record is Record<string, unknown> & CvDocumentData {
  return (
    isCvHeader(record.header) &&
    isString(record.summary) &&
    Array.isArray(record.experience) &&
    record.experience.every(isCvJobEntry) &&
    Array.isArray(record.skills) &&
    record.skills.every(isCvSkillGroup) &&
    Array.isArray(record.education) &&
    record.education.every(isCvEducationEntry) &&
    Array.isArray(record.languages) &&
    record.languages.every(isCvLanguageEntry)
  );
}

/**
 * Defensively re-validates the shape of the AI's response, same rationale
 * as parse-analysis-result.ts: the Gemini request already enforces this via
 * responseSchema, but an external service's output is never trusted
 * blindly.
 */
export function parseGeneratedCvResult(raw: unknown): GeneratedCv {
  if (typeof raw !== "object" || raw === null) {
    throw new AiServiceError("La respuesta de generación tiene un formato inesperado.");
  }

  const data = raw as Record<string, unknown>;

  const isValid =
    isCvDocumentData(data) &&
    Array.isArray(data.changes) &&
    data.changes.every(isChangeLogEntry) &&
    Array.isArray(data.keywordsSkipped) &&
    data.keywordsSkipped.every(isSkippedKeyword);

  if (!isValid) {
    throw new AiServiceError("La respuesta de generación tiene un formato inesperado.");
  }

  return {
    header: data.header as CvHeader,
    summary: data.summary as string,
    experience: data.experience as CvJobEntry[],
    skills: data.skills as CvSkillGroup[],
    education: data.education as CvEducationEntry[],
    languages: data.languages as CvLanguageEntry[],
    changes: data.changes as ChangeLogEntry[],
    keywordsSkipped: data.keywordsSkipped as SkippedKeyword[],
  };
}

const MAX_EXPORT_CONTACTS = 10;
const MAX_EXPORT_EXPERIENCE = 30;
const MAX_EXPORT_BULLETS_PER_JOB = 20;
const MAX_EXPORT_SKILL_GROUPS = 20;
const MAX_EXPORT_SKILL_ITEMS = 40;
const MAX_EXPORT_EDUCATION = 15;
const MAX_EXPORT_LANGUAGES = 10;

/**
 * Validates the CV document payload the export endpoint receives back from
 * the client (the client is round-tripping data /api/generate returned to
 * it earlier — nothing is persisted server-side, so this is the only place
 * that shape gets re-checked before being handed to a document generator).
 */
export function parseCvDocumentData(raw: unknown): CvDocumentData {
  if (typeof raw !== "object" || raw === null || !isCvDocumentData(raw as Record<string, unknown>)) {
    throw new InvalidExportPayloadError("El contenido del CV a exportar tiene un formato inválido.");
  }

  const data = raw as CvDocumentData;

  if (data.header.contacts.length > MAX_EXPORT_CONTACTS) {
    throw new InvalidExportPayloadError("El CV a exportar tiene demasiados datos de contacto.");
  }
  if (data.experience.length > MAX_EXPORT_EXPERIENCE) {
    throw new InvalidExportPayloadError("El CV a exportar tiene demasiadas experiencias laborales.");
  }
  if (data.experience.some((job) => job.bullets.length > MAX_EXPORT_BULLETS_PER_JOB)) {
    throw new InvalidExportPayloadError("Una experiencia laboral tiene demasiados puntos.");
  }
  if (data.skills.length > MAX_EXPORT_SKILL_GROUPS) {
    throw new InvalidExportPayloadError("El CV a exportar tiene demasiados grupos de habilidades.");
  }
  if (data.skills.some((group) => group.items.length > MAX_EXPORT_SKILL_ITEMS)) {
    throw new InvalidExportPayloadError("Un grupo de habilidades tiene demasiados items.");
  }
  if (data.education.length > MAX_EXPORT_EDUCATION) {
    throw new InvalidExportPayloadError("El CV a exportar tiene demasiadas entradas de educación.");
  }
  if (data.languages.length > MAX_EXPORT_LANGUAGES) {
    throw new InvalidExportPayloadError("El CV a exportar tiene demasiados idiomas.");
  }

  return data;
}
