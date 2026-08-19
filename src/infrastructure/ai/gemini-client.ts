import { GoogleGenAI } from "@google/genai";

// Reused across domains: these error types are generic to "talking to the AI
// provider," not specific to the analysis flow.
import { AiServiceError, AiServiceUnavailableError } from "@/domain/cv-analysis/errors";

/**
 * Latest stable Gemini Flash model at the time of writing — suited for
 * bounded classification/extraction tasks like this one. Shared by every
 * structured-output flow (analysis, generation): re-check
 * https://ai.google.dev/gemini-api/docs/models before bumping: avoid preview
 * or EOL model ids.
 */
const GEMINI_MODEL = "gemini-3.7-flash";

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  // Passed explicitly rather than relying on the SDK's implicit
  // GEMINI_API_KEY/GOOGLE_API_KEY auto-detection (GOOGLE_API_KEY silently
  // wins if both happen to be set) — one unambiguous env var for this app.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Fail gracefully per request rather than crashing the whole server at
    // boot — the app should still serve the landing page even if analysis
    // is temporarily misconfigured.
    throw new AiServiceUnavailableError("GEMINI_API_KEY is not configured.");
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

export interface StructuredJsonRequest {
  system: string;
  userMessage: string;
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Calls Gemini with a structured-output schema (`responseMimeType` +
 * `responseSchema`), which guarantees a schema-valid JSON response — the
 * primary defense against a malformed reply, on top of the delimited-input
 * hardening in the prompt itself.
 *
 * Generic across use cases on purpose: analysis and generation both need
 * "system + user message + JSON schema in, parsed JSON out," so this one
 * method serves both instead of duplicating a second client.
 */
const TRANSIENT_STATUS_CODES = new Set([429, 503]);
const MAX_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 1000;

function isTransientError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  return typeof status === "number" && TRANSIENT_STATUS_CODES.has(status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function requestStructuredJson({
  system,
  userMessage,
  jsonSchema,
  maxTokens = 4096,
}: StructuredJsonRequest): Promise<unknown> {
  const client = getClient();

  let response;
  try {
    // Gemini occasionally returns 503/429 during upstream capacity spikes —
    // retry those with backoff instead of failing the request immediately.
    let lastError: unknown;
    response = await (async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          return await client.models.generateContent({
            model: GEMINI_MODEL,
            contents: userMessage,
            config: {
              systemInstruction: system,
              maxOutputTokens: maxTokens,
              responseMimeType: "application/json",
              responseSchema: jsonSchema,
            },
          });
        } catch (error) {
          lastError = error;
          if (attempt === MAX_ATTEMPTS || !isTransientError(error)) {
            throw error;
          }
          await sleep(BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
        }
      }
      throw lastError;
    })();
  } catch (error) {
    throw new AiServiceError("No se pudo contactar a la API de Gemini.", { cause: error });
  }

  const text = response.text;

  if (!text) {
    throw new AiServiceError("La respuesta de Gemini no contenía el contenido esperado.");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AiServiceError("La respuesta de Gemini no era JSON válido.", { cause: error });
  }
}
