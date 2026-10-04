import { getGemini } from "./client";
import { AI_CONFIG } from "./config";
import { parseModelJson } from "./json";

export interface Moderation {
  ok: boolean;
  reason: string;
}

// Used only when the AI is unavailable: a blunt word screen so obviously bad posts still get stopped.
const BLOCKED_WORDS = /\b(kill|rape|nazi|cocaine|meth|heroin|fentanyl|escort|nudes?|porn|slur|gun|weapon|bomb)\b/i;

/**
 * Checks an event before it is saved. Returns { ok, reason }.
 * If Gemini is unavailable we fall back to a simple word screen rather than
 * blocking every post, so the demo never dead-ends.
 */
export async function moderateEvent(title: string, description: string, location: string): Promise<Moderation> {
  const ai = getGemini();
  if (ai) {
    try {
      const res = await ai.models.generateContent({
        model: AI_CONFIG.flashModel,
        contents: `You moderate event posts for SideQuest, an app where university students find things to do between classes.

Event title: ${title}
Description: ${description}
Location: ${location}

Allow normal student events: club meetings, study sessions, sports, karaoke, parties, concerts, birthdays, food runs, games, volunteering, and so on. Silly or informal posts are fine.

Block the post if it contains or promotes any of: hate or harassment, sexual content or solicitation, illegal drugs, weapons or violence, anything dangerous or illegal, scams or selling things, someone's private information, or content that targets or mocks a specific person.

Return ONLY JSON, no prose, no code fences:
{"ok": true or false, "reason": "if not ok, one short friendly sentence telling the poster what to change; if ok, an empty string"}`,
        config: { responseMimeType: "application/json", temperature: 0 },
      });
      const parsed = parseModelJson(res.text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const r = parsed as Record<string, unknown>;
        if (typeof r.ok === "boolean") {
          const reason = typeof r.reason === "string" ? r.reason.trim().slice(0, 300) : "";
          return { ok: r.ok, reason: r.ok ? "" : reason || "That event doesn't fit SideQuest. Try rewording it." };
        }
      }
      console.error("[ai/moderate] unusable model output, using the word screen:", res.text?.slice(0, 200));
    } catch (err) {
      console.error("[ai/moderate] Gemini call failed, using the word screen:", err);
    }
  }
  if (BLOCKED_WORDS.test(`${title} ${description} ${location}`)) {
    return { ok: false, reason: "That event has words we can't post. Try rewording it." };
  }
  return { ok: true, reason: "" };
}
