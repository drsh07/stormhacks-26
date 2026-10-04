import { parseVector, query } from "./db";

/**
 * Interest similarity between one user and a list of other users, as a number
 * from 0 (nothing in common) to 1 (same interests).
 *
 * Primary path: TiDB vector search does the math in SQL with
 * VEC_COSINE_DISTANCE. Fallback: if the database has no vector support, we
 * read the stored embeddings and compute cosine similarity in TypeScript.
 * Callers cannot tell which path ran.
 */
export async function interestSimilarities(userId: string, otherIds: string[]): Promise<Map<string, number>> {
  if (otherIds.length === 0) return new Map();
  if (vectorSqlAvailable !== false) {
    try {
      const rows = await query<{ id: string; similarity: number | null }>(
        `SELECT other.id AS id,
                1 - VEC_COSINE_DISTANCE(me.interests_embedding, other.interests_embedding) AS similarity
           FROM users me
           JOIN users other ON other.id IN (?)
          WHERE me.id = ?
            AND me.interests_embedding IS NOT NULL
            AND other.interests_embedding IS NOT NULL`,
        [otherIds as unknown as string, userId],
      );
      vectorSqlAvailable = true;
      return new Map(rows.map((r) => [r.id, clamp01(Number(r.similarity))]));
    } catch (err) {
      vectorSqlAvailable = false;
      console.warn("[vector] SQL vector search unavailable, using TypeScript cosine:", (err as Error).message);
    }
  }
  return similaritiesInTypeScript(userId, otherIds);
}

// Remember the answer so we only probe the database once per server process.
let vectorSqlAvailable: boolean | undefined;

async function similaritiesInTypeScript(userId: string, otherIds: string[]): Promise<Map<string, number>> {
  const rows = await query<{ id: string; interests_embedding: unknown }>(
    "SELECT id, interests_embedding FROM users WHERE id IN (?)",
    [[userId, ...otherIds] as unknown as string],
  );
  const vectors = new Map(rows.map((r) => [r.id, parseVector(r.interests_embedding)]));
  const mine = vectors.get(userId);
  const result = new Map<string, number>();
  if (!mine) return result;
  for (const id of otherIds) {
    const theirs = vectors.get(id);
    if (theirs) result.set(id, clamp01(cosineSimilarity(mine, theirs)));
  }
  return result;
}

/** cos(a, b) = (a . b) / (|a| * |b|). 1 means same direction, 0 means unrelated. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0;
}
