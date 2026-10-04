import type { GenerateContentConfig, GenerateContentParameters } from "@google/genai";
import { getGemini } from "./client";
import { AI_CONFIG } from "./config";

// The model that last worked, so we do not retry dead names on every request.
let workingModel: string | null = null;

/** Thrown when there is no API key or every model refused. The message is safe to log. */
export class AiUnavailableError extends Error {}

/**
 * One Gemini text/vision call that survives a bad model name: it tries the
 * configured Flash model, then each fallback, and remembers the winner.
 * Returns the response text. Throws AiUnavailableError if nothing works, so
 * every caller can run its own fallback.
 */
export async function generateText(
  contents: GenerateContentParameters["contents"],
  config: GenerateContentConfig,
): Promise<{ text: string | undefined; model: string }> {
  const ai = getGemini();
  if (!ai) throw new AiUnavailableError("GEMINI_API_KEY is not set");

  const candidates = [AI_CONFIG.flashModel, ...AI_CONFIG.flashFallbacks];
  const order = workingModel ? [workingModel, ...candidates.filter((m) => m !== workingModel)] : candidates;
  const errors: string[] = [];

  for (const model of order) {
    try {
      const res = await ai.models.generateContent({ model, contents, config });
      workingModel = model;
      return { text: res.text, model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${message.slice(0, 300)}`);
      // Keep going: quotas are per model, so the next one may still have room.
    }
  }
  throw new AiUnavailableError(errors.join(" | "));
}
