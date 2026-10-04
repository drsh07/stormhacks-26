import { NextResponse } from "next/server";
import { getGemini } from "@/lib/ai/client";
import { AI_CONFIG } from "@/lib/ai/config";
import { generateText } from "@/lib/ai/generate";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Open /api/health in a browser to see whether the database and Gemini are
 * working, and the exact error if not. Never returns keys or passwords.
 */
export async function GET() {
  const result: Record<string, unknown> = { gemini_key_present: !!process.env.GEMINI_API_KEY };

  try {
    const rows = await query<{ n: number }>("SELECT COUNT(*) AS n FROM users");
    result.database = { ok: true, users: Number(rows[0]?.n ?? 0) };
  } catch (err) {
    result.database = { ok: false, error: (err as Error).message.slice(0, 300) };
  }

  try {
    const res = await generateText("Reply with the single word: ready", { temperature: 0 });
    result.gemini_text = { ok: true, model: res.model, reply: res.text?.trim().slice(0, 40) };
  } catch (err) {
    result.gemini_text = { ok: false, error: (err as Error).message.slice(0, 900) };
  }

  const ai = getGemini();
  if (!ai) {
    result.gemini_embedding = { ok: false, error: "GEMINI_API_KEY is not set" };
  } else {
    try {
      const res = await ai.models.embedContent({
        model: AI_CONFIG.embeddingModel,
        contents: "bouldering and bubble tea",
        config: { outputDimensionality: AI_CONFIG.embeddingDimensions },
      });
      const dims = res.embeddings?.[0]?.values?.length ?? 0;
      result.gemini_embedding = { ok: dims === AI_CONFIG.embeddingDimensions, model: AI_CONFIG.embeddingModel, dimensions: dims };
    } catch (err) {
      result.gemini_embedding = { ok: false, model: AI_CONFIG.embeddingModel, error: (err as Error).message.slice(0, 400) };
    }
  }

  return NextResponse.json(result);
}
