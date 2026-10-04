import "./env";
import { AI_CONFIG } from "../lib/ai/config";
import { getPool } from "../lib/db";

/**
 * Creates every table. Run with: npm run db:setup
 * Add --reset to drop existing tables first: npm run db:setup -- --reset
 *
 * Vector columns use TiDB's VECTOR(n) type. If the database does not support
 * it (plain MySQL, old TiDB), we store the same "[0.1,0.2,...]" text in a
 * LONGTEXT column instead and similarity is computed in TypeScript.
 */
const TABLES = ["quests", "meetups", "events", "free_blocks", "classes", "users"];

function schema(vectorType: string): string[] {
  return [
    `CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(80) NOT NULL,
      email VARCHAR(120) NOT NULL UNIQUE,
      campus ENUM('Burnaby','Surrey','Vancouver') NOT NULL,
      program VARCHAR(80) NOT NULL DEFAULT '',
      year TINYINT NOT NULL DEFAULT 1,
      interests TEXT NOT NULL,
      interests_embedding ${vectorType} NULL,
      avatar_emoji VARCHAR(16) NOT NULL DEFAULT '🙂',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS classes (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      course_code VARCHAR(20) NOT NULL,
      day ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
      start_time CHAR(5) NOT NULL,
      end_time CHAR(5) NOT NULL,
      campus ENUM('Burnaby','Surrey','Vancouver') NOT NULL,
      INDEX idx_classes_user (user_id),
      INDEX idx_classes_course (course_code)
    )`,
    `CREATE TABLE IF NOT EXISTS free_blocks (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      day ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
      start_time CHAR(5) NOT NULL,
      end_time CHAR(5) NOT NULL,
      kind ENUM('on_campus_gap','off_campus_free') NOT NULL,
      campus ENUM('Burnaby','Surrey','Vancouver') NULL,
      INDEX idx_free_user (user_id),
      INDEX idx_free_day (day, start_time, end_time)
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id CHAR(36) PRIMARY KEY,
      host_user_id CHAR(36) NOT NULL,
      title VARCHAR(120) NOT NULL,
      description TEXT NOT NULL,
      location VARCHAR(160) NOT NULL,
      campus ENUM('Burnaby','Surrey','Vancouver') NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NOT NULL,
      embedding ${vectorType} NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_events_start (starts_at)
    )`,
    `CREATE TABLE IF NOT EXISTS meetups (
      id CHAR(36) PRIMARY KEY,
      requester_id CHAR(36) NOT NULL,
      receiver_id CHAR(36) NOT NULL,
      day ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
      start_time CHAR(5) NOT NULL,
      end_time CHAR(5) NOT NULL,
      spot VARCHAR(160) NOT NULL,
      status ENUM('proposed','accepted','completed','declined') NOT NULL DEFAULT 'proposed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_meetups_requester (requester_id),
      INDEX idx_meetups_receiver (receiver_id)
    )`,
    `CREATE TABLE IF NOT EXISTS quests (
      id CHAR(36) PRIMARY KEY,
      meetup_id CHAR(36) NOT NULL,
      title VARCHAR(160) NOT NULL,
      body TEXT NOT NULL,
      why_it_fits TEXT NOT NULL,
      time_estimate_min INT NOT NULL,
      photo_proof_instruction TEXT NOT NULL,
      status ENUM('pending','verified') NOT NULL DEFAULT 'pending',
      verdict_comment TEXT NULL,
      INDEX idx_quests_meetup (meetup_id)
    )`,
  ];
}

async function main() {
  const pool = getPool();
  const reset = process.argv.includes("--reset");

  if (reset) {
    for (const table of TABLES) await pool.query(`DROP TABLE IF EXISTS ${table}`);
    console.log("Dropped existing tables.");
  }

  // Probe for vector support with a throwaway table.
  let vectorType = `VECTOR(${AI_CONFIG.embeddingDimensions})`;
  try {
    await pool.query("DROP TABLE IF EXISTS _sq_vector_probe");
    await pool.query("CREATE TABLE _sq_vector_probe (v VECTOR(3))");
    await pool.query("SELECT VEC_COSINE_DISTANCE('[1,2,3]', '[1,2,3]')");
    await pool.query("DROP TABLE _sq_vector_probe");
    console.log(`Vector search available: using ${vectorType}.`);
  } catch {
    vectorType = "LONGTEXT";
    console.log("Vector type not available: storing embeddings as text (TypeScript cosine fallback).");
  }

  for (const statement of schema(vectorType)) await pool.query(statement);
  console.log(`Tables ready: ${[...TABLES].reverse().join(", ")}`);
  await pool.end();
}

main().catch((err) => {
  console.error("db:setup failed:", err.message ?? err);
  process.exit(1);
});
