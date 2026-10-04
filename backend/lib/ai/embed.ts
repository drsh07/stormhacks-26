import { AI_CONFIG } from "./config";
import { getGemini } from "./client";

export interface EmbedResult {
  vectors: number[][];
  source: "gemini" | "local-fallback";
}

/**
 * Embeds a batch of texts. All-or-nothing: either every vector comes from
 * Gemini or every vector comes from the local fallback, because the two live
 * in different vector spaces and must never be compared with each other.
 */
export async function embedTexts(texts: string[]): Promise<EmbedResult> {
  if (texts.length === 0) return { vectors: [], source: "gemini" };
  const ai = getGemini();
  if (ai) {
    try {
      // One request per text. Sending a list in one request is not reliable:
      // some embedding models merge the whole list into a single vector.
      const vectors: number[][] = new Array(texts.length);
      const CONCURRENCY = 5;
      let next = 0;
      const worker = async () => {
        while (next < texts.length) {
          const i = next++;
          const res = await ai.models.embedContent({
            model: AI_CONFIG.embeddingModel,
            contents: texts[i],
            config: { outputDimensionality: AI_CONFIG.embeddingDimensions },
          });
          vectors[i] = res.embeddings?.[0]?.values ?? [];
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, texts.length) }, worker));

      const bad = vectors.find((v) => v.length !== AI_CONFIG.embeddingDimensions);
      if (!bad) return { vectors, source: "gemini" };
      console.error(
        `[ai/embed] expected ${AI_CONFIG.embeddingDimensions} dimensions, got ${bad.length}; using local fallback`,
      );
    } catch (err) {
      console.error("[ai/embed] Gemini embedding failed, using local fallback:", err);
    }
  }
  return { vectors: texts.map(localEmbedding), source: "local-fallback" };
}

export async function embedText(text: string): Promise<{ vector: number[]; source: EmbedResult["source"] }> {
  const { vectors, source } = await embedTexts([text]);
  return { vector: vectors[0], source };
}

/**
 * Fallback with no network: hash each word into one of N buckets, then
 * normalize. Two texts that share words ("bouldering", "karaoke") get a high
 * cosine similarity. Not semantic, but the demo never dead-ends.
 */
export function localEmbedding(text: string): number[] {
  const dims = AI_CONFIG.embeddingDimensions;
  const vec = new Array<number>(dims).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const word of words) {
    if (word.length < 3) continue;
    let hash = 2166136261; // FNV-1a
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    vec[(hash >>> 0) % dims] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vec.map((x) => Number((x / norm).toFixed(6)));
}
