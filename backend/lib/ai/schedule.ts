import { cleanClasses } from "../schedule";
import type { Campus, ClassSlot } from "../types";
import { getGemini } from "./client";
import { AI_CONFIG } from "./config";
import { parseModelJson } from "./json";

export type ExtractResult =
  | { ok: true; classes: ClassSlot[] }
  | { ok: false; reason: "no_key" | "ai_error" | "bad_json" | "no_classes" };

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function isSupportedImage(mimeType: string): boolean {
  return ALLOWED_MIME.includes(mimeType);
}

function prompt(defaultCampus: Campus): string {
  return `You are reading a screenshot of a university student's weekly class schedule (Simon Fraser University).

Return ONLY a JSON array, no prose, no code fences. One object per class meeting per day:
[{"course_code": "CMPT 225", "day": "Tue", "start_time": "10:30", "end_time": "12:20", "campus": "Burnaby"}]

Rules:
- course_code: subject and number only, like "CMPT 225" or "MATH 152". Drop section codes like D100.
- day: exactly one of Mon, Tue, Wed, Thu, Fri, Sat, Sun. A class that meets Tue and Thu is TWO objects.
- start_time and end_time: 24-hour "HH:MM". Convert from AM/PM if needed.
- Include lectures, tutorials, and labs. Skip exams, holidays, and anything without a time.
- campus: exactly one of Burnaby, Surrey, Vancouver. Infer it from the room or location if shown
  (AQ, WMC, SSCB, BLU, TASC, SWH, RCB, ASB, SUB mean Burnaby; SRYC, SRYE, SUR mean Surrey;
  HCC, GOLDCORP, SEGAL, Harbour Centre mean Vancouver). If you cannot tell, use "${defaultCampus}".
- If the image is not a schedule or has no classes, return [].`;
}

/**
 * Screenshot -> class list. Never throws: every failure comes back as
 * { ok: false } so the app can say "add your classes by hand" instead of dying.
 */
export async function extractSchedule(
  imageBase64: string,
  mimeType: string,
  defaultCampus: Campus,
): Promise<ExtractResult> {
  const ai = getGemini();
  if (!ai) return { ok: false, reason: "no_key" };

  let text: string | undefined;
  try {
    const res = await ai.models.generateContent({
      model: AI_CONFIG.flashModel,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType, data: imageBase64 } }, { text: prompt(defaultCampus) }],
        },
      ],
      config: { responseMimeType: "application/json", temperature: 0 },
    });
    text = res.text;
  } catch (err) {
    console.error("[ai/schedule] Gemini call failed:", err);
    return { ok: false, reason: "ai_error" };
  }

  const parsed = parseModelJson(text);
  // Accept a bare array or an object that wraps one, e.g. {"classes": [...]}.
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? Object.values(parsed).find(Array.isArray)
      : null;
  if (!rows) {
    console.error("[ai/schedule] could not parse model output:", text?.slice(0, 300));
    return { ok: false, reason: "bad_json" };
  }

  const { classes } = cleanClasses(rows, defaultCampus);
  if (classes.length === 0) return { ok: false, reason: "no_classes" };
  return { ok: true, classes };
}
