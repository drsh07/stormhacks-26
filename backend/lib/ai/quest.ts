import type { Campus } from "../types";
import { getGemini } from "./client";
import { AI_CONFIG } from "./config";
import { parseModelJson } from "./json";

export interface QuestContent {
  title: string;
  body: string;
  why_it_fits: string;
  time_estimate_min: number;
  photo_proof_instruction: string;
}

export interface QuestInput {
  nameA: string;
  interestsA: string;
  nameB: string;
  interestsB: string;
  minutesAvailable: number;
  campus: Campus;
  spot: string;
  /** Title of the quest being replaced on a reroll, so we get something different. */
  avoidTitle?: string;
}

function prompt(i: QuestInput): string {
  return `You write "side quests" for SideQuest, an app that pairs two university students who have never met and gives them one small, funny mission to do together so the first meetup is not awkward.

The pair:
- ${i.nameA}, into: ${i.interestsA || "not specified"}
- ${i.nameB}, into: ${i.interestsB || "not specified"}
Where: ${i.spot}, SFU ${i.campus} campus.
Time available: ${i.minutesAvailable} minutes.
${i.avoidTitle ? `They rejected a quest called "${i.avoidTitle}". Write something clearly different.` : ""}

Write ONE quest. Tone: funny, specific, a little unhinged, never cringe or generic. Build it from what they have in common, or from the collision of their different interests, and from the actual place. It should read like an RPG quest log entry, not a team-building exercise.

Hard rules. The quest MUST be:
- legal and harmless
- free, or under $5 total
- done in a public place on or right beside campus
- doable well within the time available
- free of alcohol and drugs
- free of dares involving strangers without their consent (asking a willing passerby one polite question is the limit)
- not disruptive to classes, libraries, or people studying
- free of physical risk (no climbing on things, no running through crowds, no water)
- provable with ONE photo of the two of them or of what they made

Return ONLY JSON, no prose, no code fences:
{"title": "short punchy quest name", "body": "2 to 4 sentences telling them exactly what to do", "why_it_fits": "one sentence on why this suits these two", "time_estimate_min": <whole number of minutes, at most ${Math.min(i.minutesAvailable, 45)}>, "photo_proof_instruction": "one sentence describing the single photo that proves it"}`;
}

/** Makes sure the model's JSON has every field in a usable shape, or returns null. */
function validate(raw: unknown, minutesAvailable: number): QuestContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const title = text(r.title, 160);
  const body = text(r.body, 1200);
  const why_it_fits = text(r.why_it_fits, 400);
  const photo_proof_instruction = text(r.photo_proof_instruction, 400);
  if (!title || body.length < 20 || !photo_proof_instruction) return null;
  const estimate = Math.round(Number(r.time_estimate_min));
  const time_estimate_min = Number.isFinite(estimate) && estimate > 0 ? Math.min(estimate, minutesAvailable) : Math.min(20, minutesAvailable);
  return { title, body, why_it_fits: why_it_fits || "Because every gap between classes deserves a plot.", time_estimate_min, photo_proof_instruction };
}

/**
 * Ten hand-written quests that work at any spot on any campus. Used when
 * Gemini is down, out of quota, or returns something unusable.
 */
export const CANNED_QUESTS: QuestContent[] = [
  { title: "The Concrete Critics", time_estimate_min: 15,
    body: "Find the most dramatic piece of concrete within sight. Give it a name, a star sign, and a one-star review. You must both agree on all three before you can leave.",
    why_it_fits: "SFU is 90 percent concrete, so you will not run out of material.",
    photo_proof_instruction: "Both of you pointing at your chosen concrete like it owes you money." },
  { title: "Two Truths and a Syllabus", time_estimate_min: 15,
    body: "Each of you describes three courses: two you have really taken and one you invented. The other person has to guess the fake. Loser has to say the fake course name with total sincerity for the photo.",
    why_it_fits: "You both survive the same course catalogue.",
    photo_proof_instruction: "A selfie where the loser is mid-sentence, visibly committed to the bit." },
  { title: "The Vending Machine Oracle", time_estimate_min: 20,
    body: "Find the nearest vending machine. Without buying anything, each pick the item that best represents the other person based on the last five minutes of conversation. Defend your choice like a thesis.",
    why_it_fits: "A snack-based personality test is faster than small talk.",
    photo_proof_instruction: "Both of you pointing at the item you chose for the other person." },
  { title: "Campus Cryptid Report", time_estimate_min: 20,
    body: "Invent a cryptid that lives on this campus. Decide its name, its diet, and which building it haunts. Then draw it together on any scrap of paper, taking turns one line at a time.",
    why_it_fits: "Every campus needs folklore and somebody has to start it.",
    photo_proof_instruction: "Both of you holding up the finished drawing of your cryptid." },
  { title: "The Bench Summit", time_estimate_min: 15,
    body: "Find a bench or a seat with a view. Hold a formal two-person summit to settle one question forever: what is the single best place to eat within walking distance. You must reach a signed agreement.",
    why_it_fits: "You both have to eat, and you both have opinions.",
    photo_proof_instruction: "Both of you on the bench shaking hands like world leaders." },
  { title: "Album Cover, No Budget", time_estimate_min: 20,
    body: "You are now a band. Agree on a band name and a debut album title using only words you can see on signs around you. Then find a backdrop and pose for the album cover.",
    why_it_fits: "It needs zero musical ability and a lot of commitment.",
    photo_proof_instruction: "Your album cover: both of you posed in front of your chosen backdrop, deadly serious." },
  { title: "The Three Object Heist", time_estimate_min: 20,
    body: "Without taking anything that is not yours, find three objects nearby: something older than both of you, something that should not be that colour, and something that looks like it has a secret. Photograph only, no touching.",
    why_it_fits: "A scavenger hunt makes any walk better.",
    photo_proof_instruction: "Both of you next to your best find, one of you presenting it like a game show prize." },
  { title: "Speedrun: Become Regulars", time_estimate_min: 25,
    body: "Pick a spot right here and declare it your table. Give it a name, decide what you would order if it were a cafe, and invent one tradition you must do every time you sit here. Do the tradition once to make it official.",
    why_it_fits: "Commuter campus, no regular spot. Now you have one.",
    photo_proof_instruction: "Both of you at your new table, mid-tradition." },
  { title: "Field Guide to Students", time_estimate_min: 20,
    body: "From where you sit, write a five-entry field guide to the types of student you can see from a distance, nature-documentary style. No pointing, no names, nobody identifiable. Whisper the narration.",
    why_it_fits: "People-watching is the one sport everyone already plays.",
    photo_proof_instruction: "Both of you holding up the written field guide, wearing your best documentary-narrator faces." },
  { title: "The Worst Tour Guides", time_estimate_min: 20,
    body: "Give each other a two-minute tour of the area around you. Every fact must be confidently wrong. Whoever makes the other one laugh first loses and has to be the tourist in the photo.",
    why_it_fits: "Neither of you knows this place as well as you pretend to.",
    photo_proof_instruction: "One of you gesturing grandly at something ordinary, the other photographing it like a tourist." },
];

function cannedQuest(minutesAvailable: number, avoidTitle?: string): QuestContent {
  const pool = CANNED_QUESTS.filter((q) => q.title !== avoidTitle);
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { ...pick, time_estimate_min: Math.min(pick.time_estimate_min, minutesAvailable) };
}

/** Always returns a quest: from Gemini when it works, from the canned list when it does not. */
export async function generateQuest(input: QuestInput): Promise<{ quest: QuestContent; source: "gemini" | "canned" }> {
  const ai = getGemini();
  if (ai) {
    try {
      const res = await ai.models.generateContent({
        model: AI_CONFIG.flashModel,
        contents: prompt(input),
        config: { responseMimeType: "application/json", temperature: 1.1 },
      });
      const quest = validate(parseModelJson(res.text), input.minutesAvailable);
      if (quest) return { quest, source: "gemini" };
      console.error("[ai/quest] unusable model output, using a canned quest:", res.text?.slice(0, 300));
    } catch (err) {
      console.error("[ai/quest] Gemini call failed, using a canned quest:", err);
    }
  }
  return { quest: cannedQuest(input.minutesAvailable, input.avoidTitle), source: "canned" };
}
