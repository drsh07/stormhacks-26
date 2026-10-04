import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

/** Returns null when GEMINI_API_KEY is missing so callers can use their fallback. */
export function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}
