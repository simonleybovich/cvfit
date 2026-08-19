import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

import type { CvDocumentData, CvEducationEntry, CvJobEntry, CvLanguageEntry, CvSkillGroup } from "@/domain/cv-generation/types";

// A4 in points, matching the DOCX generator's default page size.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const TITLE_SIZE = 20;
const HEADING_SIZE = 14;
const SUBHEADING_SIZE = 11.5;
const BODY_SIZE = 10.5;
const LINE_HEIGHT = 14;
const TITLE_GAP = 10;
const HEADING_GAP = 8;
const SUBHEADING_GAP = 4;
const SECTION_GAP = 16;
const ENTRY_GAP = 8;
const BULLET_INDENT = 14;

/**
 * Deterministic PDF rendering of the already-generated, structured CV data —
 * mirrors docx-generator.ts (no second LLM call, no formatting decisions
 * left to the model). pdf-lib has no external binary/process dependency
 * (unlike LibreOffice headless, see spec.md section 6), which is the whole
 * point of this approach.
 */
export async function generateCvPdf(cv: CvDocumentData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const italicFont = await doc.embedFont(StandardFonts.HelveticaOblique);
  const headingFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const cursor = { page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN };

  function ensureSpace(height: number) {
    if (cursor.y - height < MARGIN) {
      cursor.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      cursor.y = PAGE_HEIGHT - MARGIN;
    }
  }

  function drawWrapped(text: string, font: PDFFont, size: number, x: number, maxWidth: number) {
    for (const line of wrapText(text, font, size, maxWidth)) {
      ensureSpace(LINE_HEIGHT);
      cursor.page.drawText(line, { x, y: cursor.y, size, font, color: rgb(0, 0, 0) });
      cursor.y -= LINE_HEIGHT;
    }
  }

  function drawHeading(text: string) {
    ensureSpace(HEADING_SIZE + HEADING_GAP);
    cursor.page.drawText(sanitizeForPdf(text), { x: MARGIN, y: cursor.y, size: HEADING_SIZE, font: headingFont, color: rgb(0, 0, 0) });
    cursor.y -= HEADING_SIZE + HEADING_GAP;
  }

  function drawParagraph(text: string) {
    for (const line of text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)) {
      const bulletMatch = /^[-•]\s*(.+)$/.exec(line);
      if (bulletMatch) {
        drawWrapped(`•  ${sanitizeForPdf(bulletMatch[1])}`, bodyFont, BODY_SIZE, MARGIN + BULLET_INDENT, CONTENT_WIDTH - BULLET_INDENT);
      } else {
        drawWrapped(sanitizeForPdf(line), bodyFont, BODY_SIZE, MARGIN, CONTENT_WIDTH);
      }
    }
  }

  // Header
  ensureSpace(TITLE_SIZE + TITLE_GAP);
  cursor.page.drawText(sanitizeForPdf(cv.header.name), { x: MARGIN, y: cursor.y, size: TITLE_SIZE, font: headingFont, color: rgb(0, 0, 0) });
  cursor.y -= TITLE_SIZE + TITLE_GAP;

  const contactLine = [cv.header.address, ...cv.header.contacts.map((contact) => `${contact.text}: ${contact.link}`)]
    .filter((part) => part.length > 0)
    .join("   |   ");
  if (contactLine) {
    drawWrapped(sanitizeForPdf(contactLine), bodyFont, BODY_SIZE, MARGIN, CONTENT_WIDTH);
    cursor.y -= SECTION_GAP;
  }

  // Summary
  drawHeading("Sobre mí");
  drawParagraph(cv.summary);
  cursor.y -= SECTION_GAP;

  if (cv.experience.length > 0) {
    drawHeading("Experiencia");
    for (const job of cv.experience) drawJobEntry(job);
    cursor.y -= SECTION_GAP - ENTRY_GAP;
  }

  if (cv.skills.length > 0) {
    drawHeading("Habilidades");
    for (const group of cv.skills) drawSkillGroup(group);
    cursor.y -= SECTION_GAP - ENTRY_GAP;
  }

  if (cv.education.length > 0) {
    drawHeading("Educación");
    for (const entry of cv.education) drawEducationEntry(entry);
    cursor.y -= SECTION_GAP - ENTRY_GAP;
  }

  if (cv.languages.length > 0) {
    drawHeading("Idiomas");
    for (const language of cv.languages) drawLanguageEntry(language);
  }

  function drawJobEntry(job: CvJobEntry) {
    ensureSpace(LINE_HEIGHT * 2);
    cursor.page.drawText(sanitizeForPdf(job.position), { x: MARGIN, y: cursor.y, size: SUBHEADING_SIZE, font: headingFont, color: rgb(0, 0, 0) });
    cursor.y -= SUBHEADING_SIZE + SUBHEADING_GAP;

    const subtitle = [job.institution, job.location, job.date].filter((part) => part.length > 0).join(" — ");
    if (subtitle) {
      ensureSpace(LINE_HEIGHT);
      cursor.page.drawText(sanitizeForPdf(subtitle), { x: MARGIN, y: cursor.y, size: BODY_SIZE, font: italicFont, color: rgb(0.25, 0.25, 0.25) });
      cursor.y -= LINE_HEIGHT + SUBHEADING_GAP;
    }

    for (const bullet of job.bullets) {
      drawWrapped(`•  ${sanitizeForPdf(bullet)}`, bodyFont, BODY_SIZE, MARGIN + BULLET_INDENT, CONTENT_WIDTH - BULLET_INDENT);
    }
    cursor.y -= ENTRY_GAP;
  }

  function drawSkillGroup(group: CvSkillGroup) {
    drawWrapped(`${group.title}: ${group.items.join(", ")}`, bodyFont, BODY_SIZE, MARGIN, CONTENT_WIDTH);
    cursor.y -= ENTRY_GAP / 2;
  }

  function drawEducationEntry(entry: CvEducationEntry) {
    ensureSpace(LINE_HEIGHT * 2);
    cursor.page.drawText(sanitizeForPdf(entry.institution), { x: MARGIN, y: cursor.y, size: SUBHEADING_SIZE, font: headingFont, color: rgb(0, 0, 0) });
    cursor.y -= SUBHEADING_SIZE + SUBHEADING_GAP;

    drawWrapped(sanitizeForPdf(entry.major), bodyFont, BODY_SIZE, MARGIN, CONTENT_WIDTH);

    const subtitle = [entry.location, entry.date].filter((part) => part.length > 0).join(" — ");
    if (subtitle) {
      ensureSpace(LINE_HEIGHT);
      cursor.page.drawText(sanitizeForPdf(subtitle), { x: MARGIN, y: cursor.y, size: BODY_SIZE, font: italicFont, color: rgb(0.25, 0.25, 0.25) });
      cursor.y -= LINE_HEIGHT;
    }
    cursor.y -= ENTRY_GAP;
  }

  function drawLanguageEntry(language: CvLanguageEntry) {
    drawWrapped(`${language.title}: ${language.level}`, bodyFont, BODY_SIZE, MARGIN, CONTENT_WIDTH);
    cursor.y -= ENTRY_GAP / 2;
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/** Greedy word-wrap using the font's actual metrics, so lines never overflow the page margins. */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);

  return lines;
}

/**
 * pdf-lib's standard fonts only encode WinAnsi (Latin-1-ish) characters and
 * throw on anything outside it. Gemini output is Spanish/English text (v1
 * scope, see spec.md section 3), so normalizing "smart" punctuation to plain
 * ASCII and stripping anything else out of range keeps rendering from ever
 * throwing on unexpected model output.
 */
function sanitizeForPdf(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^ -ÿ]/g, "");
}
