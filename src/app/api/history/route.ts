import { NextResponse } from "next/server";

import { listAnalysisHistoryUseCase } from "@/application/list-analysis-history-usecase";
import { saveAnalysisHistoryUseCase } from "@/application/save-analysis-history-usecase";
import { InvalidHistoryInputError, UnauthenticatedError } from "@/domain/history/errors";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "No se pudo leer la solicitud." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const { jobDescription, analysisResult, generatedCv } = body as Record<string, unknown>;

  try {
    const entry = await saveAnalysisHistoryUseCase({ jobDescription, analysisResult, generatedCv });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    return handleHistoryError(error, "[api/history POST]");
  }
}

export async function GET() {
  try {
    const entries = await listAnalysisHistoryUseCase();
    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    return handleHistoryError(error, "[api/history GET]");
  }
}

function handleHistoryError(error: unknown, logPrefix: string): NextResponse {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof InvalidHistoryInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error(`${logPrefix} Unexpected error:`, error);
  return NextResponse.json({ error: "Ocurrió un error inesperado. Intentá de nuevo." }, { status: 500 });
}
