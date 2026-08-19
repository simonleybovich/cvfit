import { NextResponse } from "next/server";

import { deleteAnalysisHistoryUseCase } from "@/application/delete-analysis-history-usecase";
import { HistoryEntryNotFoundError, UnauthenticatedError } from "@/domain/history/errors";
import { getClientIp } from "@/lib/get-client-ip";
import { checkRateLimit } from "@/lib/rate-limit";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;

  try {
    await deleteAnalysisHistoryUseCase(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof HistoryEntryNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("[api/history/[id] DELETE] Unexpected error:", error);
    return NextResponse.json({ error: "Ocurrió un error inesperado. Intentá de nuevo." }, { status: 500 });
  }
}
