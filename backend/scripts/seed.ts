import "./env";
import { randomUUID } from "node:crypto";
import { embedTexts } from "../lib/ai/embed";
import { getPool, toVectorLiteral } from "../lib/db";
import { resetDemoAccounts } from "../lib/demo";
import { computeFreeBlocks } from "../lib/free-blocks";
import { DAYS, type Campus, type ClassSlot, type Day } from "../lib/types";

/**
 * Seeds 25 fake SFU students and 12 events. Run with: npm run seed
 * Safe to re-run: it wipes every table first.
 *
 * Demo guarantee: the first eight Burnaby students all have a Tue/Thu midday
 * gap, so anyone with a normal Tue/Thu schedule gets matches.
 */

interface SeedStudent {
  name: string;
  campus: Campus;
  program: string;
  year: number;
  emoji: string;
  interests: string;
  /** "COURSE days start-end", days from Mo Tu We Th Fr, e.g. "CMPT 225 TuTh 10:30-12:20" */
  classes: string[];
}

const STUDENTS: SeedStudent[] = [
  // Burnaby, with a Tue/Thu midday gap
  { name: "Maya Chen", campus: "Burnaby", program: "Computing Science", year: 2, emoji: "🧗",
    interests: "bouldering, indie games, bubble tea, hackathons, film photography",
    classes: ["CMPT 225 TuTh 10:30-12:20", "MATH 152 TuTh 14:30-15:20", "CMPT 210 MoWeFr 11:30-12:20", "MATH 152 MoWeFr 13:30-14:20"] },
  { name: "Arjun Sidhu", campus: "Burnaby", program: "Computing Science", year: 2, emoji: "🏏",
    interests: "cricket, bhangra, chess, building side projects, spicy food challenges",
    classes: ["CMPT 225 TuTh 10:30-12:20", "CMPT 210 TuTh 14:30-16:20", "STAT 270 MoWeFr 10:30-11:20"] },
  { name: "Sofia Reyes", campus: "Burnaby", program: "Psychology", year: 3, emoji: "🎤",
    interests: "karaoke, true crime podcasts, thrifting, pottery, K-dramas",
    classes: ["PSYC 201W TuTh 09:30-11:20", "PSYC 260 TuTh 13:30-15:20", "CRIM 101 We 14:30-17:20"] },
  { name: "Liam O'Connor", campus: "Burnaby", program: "Kinesiology", year: 1, emoji: "🏃",
    interests: "trail running, pickup basketball, cooking cheap meals, hiking Burnaby Mountain, Formula 1",
    classes: ["BPK 142 TuTh 08:30-10:20", "CHEM 121 TuTh 12:30-13:20", "BPK 143 TuTh 15:30-16:20", "MATH 150 MoWeFr 09:30-10:20"] },
  { name: "Hana Takahashi", campus: "Burnaby", program: "Mathematics", year: 3, emoji: "♟️",
    interests: "chess, origami, board games, matcha, speedcubing, anime",
    classes: ["MATH 152 TuTh 14:30-15:20", "MACM 201 TuTh 11:30-12:20", "MATH 242 MoWeFr 12:30-13:20"] },
  { name: "Noah Friesen", campus: "Burnaby", program: "Engineering Science", year: 2, emoji: "🎸",
    interests: "guitar, techno, mechanical keyboards, bouldering, ramen hunting",
    classes: ["ENSC 220 TuTh 09:30-11:20", "ENSC 252 TuTh 14:30-16:20", "MATH 251 MoWeFr 10:30-11:20", "PHYS 121 MoWeFr 14:30-15:20"] },
  { name: "Priya Nair", campus: "Burnaby", program: "Business", year: 2, emoji: "📸",
    interests: "film photography, thrifting, bubble tea, Bollywood dance, startup pitch nights",
    classes: ["BUS 251 TuTh 10:30-12:20", "BUS 272 TuTh 14:30-16:20", "ECON 103 MoWe 12:30-14:20"] },
  { name: "Ethan Park", campus: "Burnaby", program: "Computing Science", year: 1, emoji: "🎮",
    interests: "indie games, anime, K-pop, game jams, late night ramen",
    classes: ["CMPT 120 TuTh 11:30-12:20", "MACM 101 TuTh 14:30-15:20", "CMPT 120 Fr 10:30-11:20", "MATH 151 MoWeFr 08:30-09:20"] },
  // Burnaby, other schedules
  { name: "Zara Ahmed", campus: "Burnaby", program: "Molecular Biology", year: 4, emoji: "🧁",
    interests: "baking, birdwatching, crochet, cozy mystery novels, farmers markets",
    classes: ["MBB 331 MoWeFr 09:30-10:20", "MBB 309W Mo 13:30-17:20", "BISC 333 We 12:30-14:20"] },
  { name: "Diego Morales", campus: "Burnaby", program: "Economics", year: 3, emoji: "⚽",
    interests: "soccer, Whitecaps games, salsa dancing, fantasy football, grilling",
    classes: ["ECON 201 MoWe 10:30-12:20", "ECON 233 MoWe 14:30-16:20", "ECON 302 Fr 10:30-13:20"] },
  { name: "Chloe Tremblay", campus: "Burnaby", program: "English", year: 2, emoji: "📚",
    interests: "poetry open mics, used bookstores, tarot, film photography, long walks with a podcast",
    classes: ["ENGL 207 Tu 12:30-14:20", "ENGL 199W Th 12:30-14:20", "HUM 130 MoWe 11:30-12:20", "FREN 122 MoWeFr 13:30-14:20"] },
  { name: "Kwame Mensah", campus: "Burnaby", program: "Physics", year: 3, emoji: "🔭",
    interests: "astronomy nights, afrobeats, pickup basketball, sci-fi novels, telescope building",
    classes: ["PHYS 285 TuTh 12:30-14:20", "PHYS 211 MoWeFr 11:30-12:20", "MATH 251 MoWeFr 10:30-11:20"] },
  { name: "Emily Zhang", campus: "Burnaby", program: "Data Science", year: 2, emoji: "🧋",
    interests: "bubble tea, badminton, journaling, K-dramas, cat cafes",
    classes: ["STAT 270 MoWeFr 10:30-11:20", "CMPT 225 MoWeFr 13:30-14:20", "DATA 180 Tu 16:30-18:20"] },
  // Surrey
  { name: "Jasleen Gill", campus: "Surrey", program: "Interactive Arts and Technology", year: 2, emoji: "🎨",
    interests: "illustration, UI design, bhangra, bubble tea, zine making",
    classes: ["IAT 235 TuTh 10:30-12:20", "IAT 267 TuTh 14:30-16:20", "IAT 202 We 09:30-12:20"] },
  { name: "Marcus Lee", campus: "Surrey", program: "Mechatronic Systems Engineering", year: 3, emoji: "🤖",
    interests: "robotics, 3D printing, mechanical keyboards, Formula 1, bouldering",
    classes: ["MSE 222 TuTh 09:30-11:20", "MSE 280 TuTh 13:30-15:20", "MSE 221 MoWe 10:30-12:20"] },
  { name: "Aaliyah Hassan", campus: "Surrey", program: "Interactive Arts and Technology", year: 1, emoji: "🎬",
    interests: "video editing, anime, cosplay, indie games, night markets",
    classes: ["IAT 100 TuTh 11:30-12:20", "IAT 110 TuTh 14:30-16:20", "CMPT 120 MoWeFr 12:30-13:20"] },
  { name: "Tyler Nguyen", campus: "Surrey", program: "Software Systems", year: 2, emoji: "🛹",
    interests: "skateboarding, hip hop production, hackathons, pho, sneaker collecting",
    classes: ["CMPT 225 TuTh 10:30-12:20", "CMPT 276 TuTh 15:30-17:20", "MACM 201 MoWeFr 09:30-10:20"] },
  { name: "Simran Dhaliwal", campus: "Surrey", program: "Sustainable Energy Engineering", year: 2, emoji: "🌱",
    interests: "gardening, cycling, climate volunteering, baking, board games",
    classes: ["SEE 221 MoWe 09:30-11:20", "SEE 224 MoWe 13:30-15:20", "SEE 251 Th 10:30-13:20"] },
  { name: "Oliver Schmidt", campus: "Surrey", program: "Mechatronic Systems Engineering", year: 4, emoji: "🏓",
    interests: "table tennis, techno, espresso nerd, drone racing, chess",
    classes: ["MSE 480 Tu 12:30-15:20", "MSE 410 Th 09:30-12:20", "MSE 411 Th 14:30-16:20"] },
  { name: "Grace Kim", campus: "Surrey", program: "Interactive Arts and Technology", year: 3, emoji: "🎹",
    interests: "piano, K-pop dance covers, karaoke, journaling, UI design",
    classes: ["IAT 334 TuTh 12:30-14:20", "IAT 339 Mo 13:30-16:20", "IAT 309W We 10:30-12:20", "IAT 355 We 14:30-17:20"] },
  // Vancouver
  { name: "Isabella Rossi", campus: "Vancouver", program: "Contemporary Arts", year: 3, emoji: "💃",
    interests: "contemporary dance, techno, thrifting, gallery openings, espresso",
    classes: ["CA 220 TuTh 10:30-12:20", "CA 285 TuTh 14:30-16:20", "CA 149 We 13:30-16:20"] },
  { name: "Jordan Williams", campus: "Vancouver", program: "Business", year: 4, emoji: "🎧",
    interests: "DJing, techno, startup pitch nights, pickup basketball, podcasts",
    classes: ["BUS 478 Tu 13:30-16:20", "BUS 360W Th 13:30-16:20", "BUS 345 Mo 17:30-20:20"] },
  { name: "Mei Lin Wong", campus: "Vancouver", program: "Publishing", year: 2, emoji: "✂️",
    interests: "zine making, used bookstores, film photography, dumplings, poetry open mics",
    classes: ["PUB 201 TuTh 09:30-11:20", "PUB 231 TuTh 13:30-15:20", "PUB 210W Fr 10:30-13:20"] },
  { name: "Rafael Costa", campus: "Vancouver", program: "Urban Studies", year: 3, emoji: "🚲",
    interests: "cycling, transit nerd, street photography, salsa dancing, cheap eats in Chinatown",
    classes: ["URB 300 Mo 14:30-17:20", "GEOG 362 We 14:30-17:20", "URB 310 Th 17:30-20:20"] },
  { name: "Fatima Al-Sayed", campus: "Vancouver", program: "Contemporary Arts", year: 1, emoji: "🎻",
    interests: "violin, film scores, sound design, karaoke, baking",
    classes: ["CA 140 TuTh 11:30-13:20", "CA 149 We 13:30-16:20", "CA 117 Fr 09:30-12:20"] },
];

interface SeedEvent {
  title: string;
  description: string;
  location: string;
  campus: Campus | null;
  day: Day;
  start: string;
  end: string;
  /** Index into STUDENTS. */
  host: number;
}

const EVENTS: SeedEvent[] = [
  { title: "Bouldering 101 with the Climbing Club", host: 0, campus: "Burnaby", day: "Tue", start: "12:30", end: "14:00",
    location: "Climbing wall, Lorne Davies Complex",
    description: "Beginner-friendly bouldering session. Shoes and chalk provided, no experience needed. Come fall off the wall with us." },
  { title: "Midday Chess Blitz", host: 4, campus: "Burnaby", day: "Thu", start: "12:30", end: "13:30",
    location: "AQ 3000 level, north concourse tables",
    description: "Five-minute blitz games, all levels. Bring a board if you have one. Winner picks the next opening everyone must play." },
  { title: "Karaoke Night at the SUB", host: 2, campus: "Burnaby", day: "Thu", start: "18:00", end: "21:00",
    location: "Student Union Building, ballroom",
    description: "Open karaoke, zero talent required. Sing pop, K-pop, Bollywood, or that one emo song from grade 9. Free snacks." },
  { title: "CMPT 225 Study Jam", host: 1, campus: "Burnaby", day: "Wed", start: "15:00", end: "17:00",
    location: "Bennett Library, 4th floor group rooms",
    description: "Group study for data structures: linked lists, trees, and Big-O practice problems before the midterm. Bring your laptop." },
  { title: "Game Dev Club: Mini Game Jam", host: 7, campus: "Burnaby", day: "Fri", start: "14:30", end: "17:30",
    location: "Applied Sciences Building, ASB 9705",
    description: "Make a tiny indie game in three hours. Artists, programmers, and people who just want to playtest are all welcome." },
  { title: "Film Photo Walk on the Mountain", host: 6, campus: "Burnaby", day: "Tue", start: "16:30", end: "18:00",
    location: "Meet at the Convocation Mall steps",
    description: "Bring any camera, film or phone. We walk the campus brutalist concrete and trails at golden hour and trade shots after." },
  { title: "Astronomy Night at the Observatory", host: 11, campus: "Burnaby", day: "Fri", start: "19:00", end: "21:00",
    location: "Trottier Observatory",
    description: "Look at Saturn and the Moon through the big telescope, weather permitting. Hot chocolate and star charts provided." },
  { title: "Zine Making Workshop", host: 13, campus: "Surrey", day: "Thu", start: "12:30", end: "14:00",
    location: "SFU Surrey, mezzanine",
    description: "Cut, paste, staple. Make an eight-page zine about anything: your commute, your cat, your worst group project. Illustration supplies provided." },
  { title: "Robotics Club Build Session", host: 14, campus: "Surrey", day: "Wed", start: "16:00", end: "18:00",
    location: "SFU Surrey, engineering building maker space",
    description: "Open build night: 3D printing, soldering, and getting the line-following robot to stop driving into walls." },
  { title: "Aaliyah's Birthday Boba Run", host: 15, campus: "Surrey", day: "Tue", start: "16:30", end: "18:00",
    location: "Central City, outside the bubble tea place",
    description: "It's my birthday and I am buying nobody boba but you should come anyway. Casual hangout, anime opinions welcome." },
  { title: "Techno Night: Student DJs", host: 21, campus: "Vancouver", day: "Fri", start: "19:30", end: "22:00",
    location: "Goldcorp Centre for the Arts, studio T",
    description: "Student DJs play techno and house. No cover, all-ages, earplugs at the door. Come dance or just nod seriously near the speakers." },
  { title: "Poetry and Zine Open Mic", host: 22, campus: "Vancouver", day: "Wed", start: "17:30", end: "19:00",
    location: "Harbour Centre, student lounge",
    description: "Read a poem, a page from your zine, or a dramatic reading of a transit delay notice. Listeners welcome too." },
];

const DAY_CODES: Record<string, Day> = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" };

function parseClasses(lines: string[], campus: Campus): ClassSlot[] {
  const slots: ClassSlot[] = [];
  for (const line of lines) {
    const match = line.match(/^(.+) ((?:Mo|Tu|We|Th|Fr|Sa|Su)+) (\d\d:\d\d)-(\d\d:\d\d)$/);
    if (!match) throw new Error(`Bad class line in seed data: "${line}"`);
    const [, course_code, dayCodes, start_time, end_time] = match;
    for (const code of dayCodes.match(/.{2}/g) ?? []) {
      slots.push({ course_code, day: DAY_CODES[code], start_time, end_time, campus });
    }
  }
  return slots;
}

/** "YYYY-MM-DD" of the next time `day` happens in Vancouver (today counts). */
function nextDateFor(day: Day): string {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Vancouver" }).format(now);
  const todayName = new Intl.DateTimeFormat("en-US", { timeZone: "America/Vancouver", weekday: "short" }).format(now) as Day;
  const daysAhead = (DAYS.indexOf(day) - DAYS.indexOf(todayName) + 7) % 7;
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + daysAhead)).toISOString().slice(0, 10);
}

async function main() {
  const pool = getPool();

  console.log("Embedding interests and events...");
  const texts = [
    ...STUDENTS.map((s) => s.interests),
    ...EVENTS.map((e) => `${e.title}. ${e.description}`),
  ];
  const { vectors, source } = await embedTexts(texts);
  console.log(
    source === "gemini"
      ? "Embeddings from Gemini."
      : "Embeddings from the local keyword fallback (set GEMINI_API_KEY and re-seed for real ones).",
  );

  for (const table of ["quests", "meetups", "events", "free_blocks", "classes", "users"]) {
    await pool.query(`DELETE FROM ${table}`);
  }

  const userIds: string[] = [];
  let classCount = 0;
  let blockCount = 0;

  for (const [i, s] of STUDENTS.entries()) {
    const id = randomUUID();
    userIds.push(id);
    const email = `${s.name.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "")}@sfu.ca`;
    await pool.query(
      `INSERT INTO users (id, name, email, campus, program, year, interests, interests_embedding, avatar_emoji)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, s.name, email, s.campus, s.program, s.year, s.interests, toVectorLiteral(vectors[i]), s.emoji],
    );

    const classes = parseClasses(s.classes, s.campus);
    if (classes.length > 0) {
      await pool.query(
        "INSERT INTO classes (id, user_id, course_code, day, start_time, end_time, campus) VALUES ?",
        [classes.map((c) => [randomUUID(), id, c.course_code, c.day, c.start_time, c.end_time, c.campus])],
      );
    }
    const blocks = computeFreeBlocks(classes);
    await pool.query(
      "INSERT INTO free_blocks (id, user_id, day, start_time, end_time, kind, campus) VALUES ?",
      [blocks.map((b) => [randomUUID(), id, b.day, b.start_time, b.end_time, b.kind, b.campus])],
    );
    classCount += classes.length;
    blockCount += blocks.length;
  }

  for (const [i, e] of EVENTS.entries()) {
    const date = nextDateFor(e.day);
    await pool.query(
      `INSERT INTO events (id, host_user_id, title, description, location, campus, starts_at, ends_at, embedding)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [randomUUID(), userIds[e.host], e.title, e.description, e.location, e.campus,
        `${date} ${e.start}:00`, `${date} ${e.end}:00`, toVectorLiteral(vectors[STUDENTS.length + i])],
    );
  }

  await resetDemoAccounts();
  console.log("Demo accounts ready: Demo Alex (demo1@sfu.ca) and Demo Sam (demo2@sfu.ca).");

  console.log(`Seeded ${STUDENTS.length} students, ${classCount} classes, ${blockCount} free blocks, ${EVENTS.length} events.`);
  await pool.end();
}

main().catch((err) => {
  console.error("seed failed:", err.message ?? err);
  process.exit(1);
});
