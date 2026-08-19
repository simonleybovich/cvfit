import type { CvDocumentData, CvEducationEntry, CvJobEntry, CvSkillGroup } from "@/domain/cv-generation/types";

/**
 * Emits Typst *source text* for the user's personal `silver-dev-cv` package
 * — no compilation happens server-side, this is pure string templating that
 * the user compiles themselves with their own Typst toolchain. The import
 * and the trailing `#set document(...)` are hardcoded exactly as the
 * user's real working template has them (see spec.md), not meant to be
 * generic/configurable.
 */
export function generateCvTypst(cv: CvDocumentData): string {
  const date = new Date().toISOString().slice(0, 10);

  const parts: string[] = [];

  parts.push('#import "@preview/silver-dev-cv:1.0.2": *', "");
  parts.push(buildHeaderBlock(cv, date), "", "");

  parts.push("// about", "#section[Sobre mi]", `#descript[${markup(cv.summary)}]`);

  if (cv.experience.length > 0) {
    parts.push("", "#sectionsep", "//Experience", '#section("Experiencia")');
    parts.push(cv.experience.map(buildJobBlock).join("\n"));
  }

  if (cv.skills.length > 0) {
    parts.push("", '#section("Habilidades")');
    parts.push(cv.skills.map(buildOnelineTitleItem).join("\n"));
  }

  if (cv.education.length > 0) {
    parts.push("", "#sectionsep", '#section("Educacion")');
    parts.push(cv.education.map(buildEducationBlock).join("\n"));
  }

  if (cv.languages.length > 0) {
    parts.push("", "#sectionsep", '#section("Lenguajes")');
    parts.push(cv.languages.map((language) => buildOnelineTitleItem({ title: language.title, items: [language.level] })).join("\n"));
  }

  parts.push("", '#set document(author: "silver", title: "Silver CV Template")', "");

  return parts.join("\n");
}

function buildHeaderBlock(cv: CvDocumentData, date: string): string {
  const contactLines = cv.header.contacts
    .map((contact) => `    (text: "${str(contact.text)}", link: "${str(contact.link)}"),`)
    .join("\n");

  return [
    "#show: cv.with(",
    '  font-type: "PT Serif",',
    '  continue-header: "false",',
    `  name: "${str(cv.header.name)}",`,
    `  address: "${str(cv.header.address)}",`,
    '  lastupdated: "false",',
    '  pagecount: "true",',
    `  date: "${date}",`,
    "  contacts: (",
    contactLines,
    "  ),",
    ")",
  ].join("\n");
}

function buildJobBlock(job: CvJobEntry): string {
  const bulletLines = job.bullets.map((bullet) => `    - ${markup(bullet)}`).join("\n");
  return [
    "#job(",
    `  position: "${str(job.position)}",`,
    `  institution: [${markup(job.institution)}],`,
    `  location: "${str(job.location)}",`,
    `  date: "${str(job.date)}",`,
    "description: [",
    bulletLines,
    "  ],",
    ")",
  ].join("\n");
}

function buildOnelineTitleItem(group: CvSkillGroup): string {
  return ["#oneline-title-item(", `  title: "${str(group.title)}",`, `  content: [${markup(group.items.join(", "))}],`, ")"].join("\n");
}

function buildEducationBlock(entry: CvEducationEntry): string {
  return [
    "#education(",
    `  institution: [${markup(entry.institution)}],`,
    `  major: [${markup(entry.major)}],`,
    `  date: "${str(entry.date)}",`,
    `  location: "${str(entry.location)}",`,
    ")",
  ].join("\n");
}

/**
 * Escapes text for use as `"..."` string-literal content — only `\` and `"`
 * are meaningful there. Collapses to a single line: Typst string literals
 * don't support raw newlines.
 */
function str(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/[\\"]/g, (ch) => `\\${ch}`);
}

/**
 * Escapes text for use as `[...]` markup content. Every character Typst
 * treats as syntax there (`\ # [ ] $ @ < > * _ \`` plus `/` — neutralized so
 * `//`/`/*` can never start a comment) is backslash-escaped in a single
 * pass, so previously-inserted backslashes are never re-escaped. Collapses
 * to a single line — bullets are joined by the caller, not embedded here.
 */
function markup(text: string): string {
  return text.replace(/\s+/g, " ").trim().replace(/[\\#[\]$@<>*_`/]/g, (ch) => `\\${ch}`);
}
