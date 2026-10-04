import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

// Reuse one pool across hot reloads in dev and across requests in a warm lambda.
const globalForDb = globalThis as unknown as { sqPool?: Pool };

export function getPool(): Pool {
  if (globalForDb.sqPool) return globalForDb.sqPool;
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  const isLocal = /@(localhost|127\.0\.0\.1)/.test(uri);
  globalForDb.sqPool = mysql.createPool({
    uri,
    // TiDB Cloud Serverless refuses non-TLS connections.
    ssl: isLocal ? undefined : { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectionLimit: 5,
    timezone: "Z",
    dateStrings: true, // keep DATETIME as "YYYY-MM-DD HH:MM:SS" (Vancouver wall time)
  });
  return globalForDb.sqPool;
}

type Param = string | number | boolean | null;

export async function query<T>(sql: string, params: Param[] = []): Promise<T[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function execute(sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  const [result] = await getPool().query<ResultSetHeader>(sql, params);
  return result;
}

/** number[] -> "[0.1,0.2,...]", the literal TiDB accepts for a VECTOR column. */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

/** Reads a vector back whether the driver gives us a string or a parsed array. */
export function parseVector(value: unknown): number[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value as number[];
  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? (parsed as number[]) : null;
  } catch {
    return null;
  }
}
