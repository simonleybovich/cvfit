import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";

import type { CvDocumentData, CvEducationEntry, CvJobEntry, CvLanguageEntry, CvSkillGroup } from "@/domain/cv-generation/types";

/**
 * Deterministic DOCX rendering of the already-generated, structured CV data
 * — no second LLM call, no formatting decisions left to the model. Kept
 * intentionally simple (spec.md section 13 only requires that it opens
 * correctly in Word), but structured fields let this read like a real CV
 * (real headings, contact line, bulleted job entries) instead of a wall of
 * generic prose.
 */
export async function generateCvDocx(cv: CvDocumentData): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ text: cv.header.name, heading: HeadingLevel.TITLE }),
    ...headerContactParagraphs(cv),
    new Paragraph({ text: "Sobre mí", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: cv.summary }),
  ];

  if (cv.experience.length > 0) {
    children.push(new Paragraph({ text: "Experiencia", heading: HeadingLevel.HEADING_1 }));
    for (const job of cv.experience) children.push(...jobParagraphs(job));
  }

  if (cv.skills.length > 0) {
    children.push(new Paragraph({ text: "Habilidades", heading: HeadingLevel.HEADING_1 }));
    for (const group of cv.skills) children.push(...skillGroupParagraphs(group));
  }

  if (cv.education.length > 0) {
    children.push(new Paragraph({ text: "Educación", heading: HeadingLevel.HEADING_1 }));
    for (const entry of cv.education) children.push(...educationParagraphs(entry));
  }

  if (cv.languages.length > 0) {
    children.push(new Paragraph({ text: "Idiomas", heading: HeadingLevel.HEADING_1 }));
    for (const language of cv.languages) children.push(languageParagraph(language));
  }

  const document = new Document({
    sections: [{ children }],
  });

  return Packer.toBuffer(document);
}

function headerContactParagraphs(cv: CvDocumentData): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  if (cv.header.address) {
    paragraphs.push(new Paragraph({ text: cv.header.address }));
  }
  if (cv.header.contacts.length > 0) {
    const contactLine = cv.header.contacts.map((contact) => `${contact.text}: ${contact.link}`).join("  |  ");
    paragraphs.push(new Paragraph({ text: contactLine }));
  }
  return paragraphs;
}

function jobParagraphs(job: CvJobEntry): Paragraph[] {
  const subtitleParts = [job.institution, job.location, job.date].filter((part) => part.length > 0);
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: job.position, bold: true })],
    }),
    new Paragraph({ text: subtitleParts.join(" — "), run: { italics: true } }),
    ...job.bullets.map((bullet) => new Paragraph({ text: bullet, bullet: { level: 0 } })),
  ];
}

function skillGroupParagraphs(group: CvSkillGroup): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: `${group.title}: `, bold: true }), new TextRun({ text: group.items.join(", ") })],
    }),
  ];
}

function educationParagraphs(entry: CvEducationEntry): Paragraph[] {
  const subtitleParts = [entry.location, entry.date].filter((part) => part.length > 0);
  return [
    new Paragraph({
      children: [new TextRun({ text: entry.institution, bold: true })],
    }),
    new Paragraph({ text: entry.major }),
    ...(subtitleParts.length > 0 ? [new Paragraph({ text: subtitleParts.join(" — "), run: { italics: true } })] : []),
  ];
}

function languageParagraph(language: CvLanguageEntry): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text: `${language.title}: `, bold: true }), new TextRun({ text: language.level })],
  });
}
