/**
 * The only place the app talks to the backend. API keys and the database
 * never live on the phone: every AI and DB call goes through these routes.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const TIMEOUT_MS = 20000;
/** For calls that wait on the AI (reading a schedule, writing a quest, checking a photo). */
export const AI_TIMEOUT_MS = 60000;

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Set by the session provider so every request carries the signed-in user.
let currentUserId: string | null = null;
export function setApiUserId(id: string | null) {
  currentUserId = id;
}

// Called when the server no longer recognises the signed-in user (for example
// after the database was re-seeded), so the app can sign out cleanly.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** Plain object (sent as JSON) or FormData (for photo uploads). */
  body?: Record<string, unknown> | FormData;
  /** Override the signed-in user for this one call. */
  userId?: string | null;
  /** How long to wait before giving up. Defaults to 20 seconds. */
  timeoutMs?: number;
}

/** Fetch JSON from the backend. Throws ApiError with a message that is safe to show. */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const userId = options.userId === undefined ? currentUserId : options.userId;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (userId) headers['x-user-id'] = userId;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? (isForm ? (body as FormData) : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } catch {
    if (timedOut) throw new ApiError('That took too long and we gave up. Try again.', 0);
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON response (for example an HTML error page).
  }

  if (!res.ok) {
    if (res.status === 401 && userId && userId === currentUserId) onUnauthorized?.();
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `The server returned an error (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}
