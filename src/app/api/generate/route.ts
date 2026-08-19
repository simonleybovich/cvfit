import { NextResponse } from "next/server";

import { generateCvUseCase } from "@/application/generate-cv-usecase";
import {
  AiServiceError,
  AiServiceUnavailableError,
  CvParsingError,
  EmptyJobDescriptionError,
  FileTooLargeError,
  InvalidFileTypeError,
} from "@/domain/cv-analysis/errors";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

// pdf-parse and mammoth need Node APIs (Buffer, fs internals) — this route
// cannot run on the Edge runtime.
export const runtime = "nodejs";

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la solicitud." }, { status: 400 });
  }

  const file = formData.get("cvFile");
  const jobDescription = formData.get("jobDescription");
  const priorAnalysisRaw = formData.get("priorAnalysis");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Subí un archivo de CV en formato PDF o DOCX." }, { status: 400 });
  }
  if (typeof jobDescription !== "string") {
    return NextResponse.json({ error: "Pegá la descripción del puesto." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await generateCvUseCase({
      fileBuffer,
      fileName: file.name,
      mimeType: file.type,
      jobDescription,
      priorAnalysis: parsePriorAnalysis(priorAnalysisRaw),
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleGenerateError(error);
  }
}

/** priorAnalysis travels as a JSON string form field; absent or malformed just means "no context to reuse." */
function parsePriorAnalysis(raw: FormDataEntryValue | null): { keywordsFound?: unknown; keywordsMissing?: unknown } | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    return { keywordsFound: record.keywordsFound, keywordsMissing: record.keywordsMissing };
  } catch {
    return null;
  }
}

function handleGenerateError(error: unknown): NextResponse {
  if (error instanceof InvalidFileTypeError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof FileTooLargeError) {
    return NextResponse.json({ error: error.message }, { status: 413 });
  }
  if (error instanceof EmptyJobDescriptionError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof CvParsingError) {
    return NextResponse.json({ error: error.message }, { status: 422 });
  }
  if (error instanceof AiServiceUnavailableError) {
    console.error("[api/generate] AI service unavailable:", error.message, error.cause ?? "");
    return NextResponse.json(
      { error: "El servicio de generación no está disponible en este momento. Probá más tarde." },
      { status: 503 },
    );
  }
  if (error instanceof AiServiceError) {
    console.error("[api/generate] AI service error:", error.message, error.cause ?? "");
    return NextResponse.json(
      { error: "No pudimos generar el CV en este momento. Intentá de nuevo en unos minutos." },
      { status: 502 },
    );
  }

  console.error("[api/generate] Unexpected error:", error);
  return NextResponse.json({ error: "Ocurrió un error inesperado. Intentá de nuevo." }, { status: 500 });
}
