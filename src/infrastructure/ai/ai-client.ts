import { AiServiceError } from "@/domain/cv-analysis/errors";

import * as geminiClient from "./gemini-client";
import * as opencodeClient from "./opencode-client";
import type { StructuredJsonRequest } from "./opencode-client";

/**
 * Provider-agnostic entry point used by both analysis and generation.
 * OpenCode Go (cheap open models behind an OpenAI-compatible endpoint) is
 * the primary provider; Gemini is the fallback, kept because it's the
 * previously-working implementation and gives a second, independent
 * upstream to fall back on when OpenCode is unavailable or errors out.
 */
export async function requestStructuredJson(request: StructuredJsonRequest): Promise<unknown> {
  try {
    return await opencodeClient.requestStructuredJson(request);
  } catch (error) {
    if (!(error instanceof AiServiceError)) throw error;
    console.warn("[ai-client] OpenCode failed, falling back to Gemini.", error);
    return await geminiClient.requestStructuredJson(request);
  }
}
