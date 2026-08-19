import { NextResponse } from "next/server";

import { analyzeCvUseCase } from "@/application/analyze-cv-usecase";
import {
  AiServiceError,
  AiServiceUnavailableError,
  CvParsingError,
  EmptyJobDescriptionError,
  FileTooLargeError,
  InvalidFileTypeError,
  UnauthenticatedError,
} from "@/domain/cv-analysis/errors";
import { getCurrentUser } from "@/infrastructure/auth/supabase-server-client";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRequestRateLimit } from "@/lib/rate-limit";

// pdf-parse and mammoth need Node APIs (Buffer, fs internals) — this route
// cannot run on the Edge runtime.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);
  // getCurrentUser() is cache()-wrapped — analyzeCvUseCase's own auth check
  // reuses this same call within the request, no extra Supabase round trip.
  const user = await getCurrentUser();
  const rateLimit = checkRequestRateLimit(clientIp, user?.id);
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

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Subí un archivo de CV en formato PDF o DOCX." }, { status: 400 });
  }
  if (typeof jobDescription !== "string") {
    return NextResponse.json({ error: "Pegá la descripción del puesto." }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await analyzeCvUseCase({
      fileBuffer,
      fileName: file.name,
      mimeType: file.type,
      jobDescription,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleAnalyzeError(error);
  }
}

function handleAnalyzeError(error: unknown): NextResponse {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
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
    console.error("[api/analyze] AI service unavailable:", error.message, error.cause ?? "");
    return NextResponse.json(
      { error: "El servicio de análisis no está disponible en este momento. Probá más tarde." },
      { status: 503 },
    );
  }
  if (error instanceof AiServiceError) {
    console.error("[api/analyze] AI service error:", error.message, error.cause ?? "");
    return NextResponse.json(
      { error: "No pudimos completar el análisis en este momento. Intentá de nuevo en unos minutos." },
      { status: 502 },
    );
  }

  console.error("[api/analyze] Unexpected error:", error);
  return NextResponse.json({ error: "Ocurrió un error inesperado. Intentá de nuevo." }, { status: 500 });
}
