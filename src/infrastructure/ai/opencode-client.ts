import OpenAI from "openai";

// Reused across domains: these error types are generic to "talking to the AI
// provider," not specific to the analysis flow.
import { AiServiceError, AiServiceUnavailableError } from "@/domain/cv-analysis/errors";

const OPENCODE_BASE_URL = "https://opencode.ai/zen/go/v1";

/**
 * mimo-v2.5, picked by hand-testing several OpenCode Go models against this
 * app's actual schemas:
 * - deepseek-v4-flash/-pro: 403 RegionError — that model version is gated
 *   behind an explicit China-hosting opt-in on the account, not just an API
 *   key.
 * - glm-5.2, kimi-k2.6, qwen3.6-plus: reasoning models that spend
 *   hundreds of hidden `reasoning_content` tokens per call even on a
 *   trivial prompt — the opposite of "cheap."
 * - minimax-m2.7: ignored the JSON schema outright (invented its own field
 *   names), so it fails downstream shape validation.
 * mimo-v2.5 returned schema-exact JSON with zero reasoning tokens on both
 * the analysis and the (much larger) rewrite schema. Overridable via env if
 * a future model needs evaluating without a code change.
 */
const OPENCODE_MODEL = process.env.OPENCODE_MODEL ?? "mimo-v2.5";

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    throw new AiServiceUnavailableError("OPENCODE_API_KEY is not configured.");
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey, baseURL: OPENCODE_BASE_URL });
  }
  return cachedClient;
}

export interface StructuredJsonRequest {
  system: string;
  userMessage: string;
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
}

// Mirrors gemini-client.ts's retry policy so both providers behave the same
// way under upstream capacity spikes.
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

/**
 * Calls an OpenCode Go model (OpenAI-compatible endpoint) with a JSON-schema
 * response format. Not run in `strict` mode: schema fidelity varies across
 * the 18 open models behind this one endpoint, so callers re-validate the
 * shape themselves (see parse-analysis-result.ts / parse-generation-result.ts)
 * rather than trusting the provider to enforce it.
 */
export async function requestStructuredJson({
  system,
  userMessage,
  jsonSchema,
  maxTokens = 4096,
}: StructuredJsonRequest): Promise<unknown> {
  const client = getClient();

  let response;
  try {
    let lastError: unknown;
    response = await (async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          return await client.chat.completions.create({
            model: OPENCODE_MODEL,
            messages: [
              { role: "system", content: system },
              { role: "user", content: userMessage },
            ],
            max_tokens: maxTokens,
            response_format: {
              type: "json_schema",
              json_schema: { name: "response", schema: jsonSchema, strict: false },
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
    throw new AiServiceError("No se pudo contactar a la API de OpenCode.", { cause: error });
  }

  const text = response.choices[0]?.message?.content;

  if (!text) {
    throw new AiServiceError("La respuesta de OpenCode no contenía el contenido esperado.");
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new AiServiceError("La respuesta de OpenCode no era JSON válido.", { cause: error });
  }
}
