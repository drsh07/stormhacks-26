/**
 * Every model name lives here. Change a model in one place.
 * Verified against ai.google.dev model docs on Oct 3, 2026.
 */
export const AI_CONFIG = {
  /** Text + vision: schedule extraction, quests, photo verification, moderation. */
  flashModel: "gemini-3.8-flash",
  /** Interest and event embeddings. Swap to "gemini-embedding-001" if this errors. */
  embeddingModel: "gemini-embedding-2",
  /** Must match VECTOR(n) in scripts/setup-db.ts. Re-run db:setup + seed if changed. */
  embeddingDimensions: 768,
} as const;
