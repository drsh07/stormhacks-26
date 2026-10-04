/**
 * Gemini sometimes wraps JSON in ```json fences or adds a sentence around it.
 * This strips the fences and pulls out the first JSON value. Returns null if
 * nothing parses, so callers can fall back instead of crashing.
 */
export function parseModelJson(raw: string | undefined | null): unknown {
  if (!raw) return null;
  let text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(text);
  } catch {
    // Fall through: look for the outermost [...] or {...}.
  }
  const starts = [text.indexOf("["), text.indexOf("{")].filter((i) => i >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const end = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (end <= start) return null;
  text = text.slice(start, end + 1);
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
