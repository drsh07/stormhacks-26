import { generateText } from "./generate";
import { parseModelJson } from "./json";
import type { QuestContent } from "./quest";

export interface Verdict {
  verified: boolean;
  comment: string;
}

const FALLBACK: Verdict = {
  verified: true,
  comment: "The quest master blinked and missed it, but your confidence is convincing. Quest complete.",
};

/**
 * Looks at the proof photo and decides whether the quest was done.
 * Lenient on purpose: this is a game, not an exam. If the AI is unavailable
 * we take the pair's word for it so the demo never dead-ends.
 * The photo is only passed through to Gemini; it is never stored.
 */
export async function verifyQuestPhoto(quest: QuestContent, imageBase64: string, mimeType: string): Promise<Verdict> {
  try {
    const res = await generateText(
      [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            {
              text: `Two students were given this side quest:
Title: ${quest.title}
What to do: ${quest.body}
Photo proof required: ${quest.photo_proof_instruction}

The attached photo is their proof. Decide whether it plausibly shows them doing the quest.
Be lenient: if the photo could reasonably be the proof (right kind of scene, people or object roughly matching), verify it. Only reject photos that are clearly unrelated (a blank image, a screenshot, a random object with no link to the quest).

Return ONLY JSON, no prose, no code fences:
{"verified": true or false, "comment": "one playful line reacting to the photo, under 25 words"}
If you reject it, the comment should say kindly what the photo needs to show.`,
            },
          ],
        },
      ],
      { responseMimeType: "application/json", temperature: 0.7 },
    );
    const parsed = parseModelJson(res.text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const r = parsed as Record<string, unknown>;
      if (typeof r.verified === "boolean") {
        const comment = typeof r.comment === "string" && r.comment.trim() ? r.comment.trim().slice(0, 300) : r.verified ? "Quest complete." : "That photo doesn't look like the quest. Try another one.";
        return { verified: r.verified, comment };
      }
    }
    console.error("[ai/verify] unusable model output, accepting the photo:", res.text?.slice(0, 300));
  } catch (err) {
    console.error("[ai/verify] Gemini call failed, accepting the photo:", err);
  }
  return FALLBACK;
}
