/**
 * Every model name lives here. Change a model in one place.
 * Verified against ai.google.dev model docs on Oct 3, 2026.
 */
export const AI_CONFIG = {
  /** Text + vision: schedule extraction, quests, photo verification, moderation. */
  flashModel: "gemini-3.8-flash",
  /**
   * Tried in order if the model above is rejected (wrong name for this key,
   * retired model, and so on). The first one that answers is remembered.
   */
  flashFallbacks: ["gemini-flash-latest", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"],
  /** Interest and event embeddings (text only). "gemini-embedding-2" also works. */
  embeddingModel: "gemini-embedding-001",
  /** Must match VECTOR(n) in scripts/setup-db.ts. Re-run db:setup + seed if changed. */
  embeddingDimensions: 768,
} as const;
