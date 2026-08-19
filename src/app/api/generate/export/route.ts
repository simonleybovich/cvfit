import { NextResponse } from "next/server";

import { InvalidExportPayloadError } from "@/domain/cv-generation/errors";
import { parseCvDocumentData } from "@/domain/cv-generation/parse-generation-result";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { generateCvDocx } from "@/infrastructure/generation/docx-generator";
import { generateCvPdf } from "@/infrastructure/generation/pdf-generator";
import { generateCvTypst } from "@/infrastructure/generation/typst-generator";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

// The `docx` package's Packer relies on Node APIs (Buffer, zip internals) —
// this route cannot run on the Edge runtime.
export const runtime = "nodejs";

type ExportFormat = "docx" | "pdf" | "typst";

const EXPORT_FORMATS: Record<ExportFormat, { contentType: string; filename: string }> = {
  docx: {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "cv-optimizado.docx",
  },
  pdf: {
    contentType: "application/pdf",
    filename: "cv-optimizado.pdf",
  },
  typst: {
    // text/plain is the safe default for an unregistered/uncommon format —
    // no compilation happens here, this is just .typ source text for the
    // user to compile themselves with their own Typst toolchain.
    contentType: "text/plain; charset=utf-8",
    filename: "cv-optimizado.typ",
  },
};

function parseExportFormat(value: unknown): ExportFormat {
  if (value === "pdf") return "pdf";
  if (value === "typst") return "typst";
  if (value === undefined || value === "docx") return "docx";
  throw new InvalidExportPayloadError('El formato de exportación debe ser "docx", "pdf" o "typst".');
}

/**
 * Deterministic, non-AI endpoint: the client sends back the structured CV
 * data /api/generate already returned to it (nothing is persisted
 * server-side), and this just renders it to a .docx, .pdf, or .typ file. No
 * second Gemini call.
 */
export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Hiciste demasiadas solicitudes. Esperá un momento antes de volver a intentarlo." },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
      },
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Iniciá sesión para descargar el CV generado." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la solicitud." }, { status: 400 });
  }

  try {
    const record = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const cv = parseCvDocumentData(record.cv);
    const format = parseExportFormat(record.format);

    const fileContent = await renderExport(cv, format);
    const { contentType, filename } = EXPORT_FORMATS[format];

    // Cast needed: TS 5.7+'s generic Uint8Array<ArrayBufferLike> doesn't
    // structurally satisfy dom lib's BodyInit, even though it's a valid
    // Response body at runtime (same underlying mismatch as microsoft/TypeScript#60717).
    return new NextResponse(fileContent as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleExportError(error);
  }
}

async function renderExport(cv: ReturnType<typeof parseCvDocumentData>, format: ExportFormat): Promise<Uint8Array> {
  if (format === "pdf") return new Uint8Array(await generateCvPdf(cv));
  if (format === "typst") return new TextEncoder().encode(generateCvTypst(cv));
  return new Uint8Array(await generateCvDocx(cv));
}

function handleExportError(error: unknown): NextResponse {
  if (error instanceof InvalidExportPayloadError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error("[api/generate/export] Unexpected error:", error);
  return NextResponse.json({ error: "No pudimos generar el archivo. Intentá de nuevo." }, { status: 500 });
}
