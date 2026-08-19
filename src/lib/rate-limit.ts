/**
 * In-memory sliding-window rate limiter, keyed by client identifier (IP).
 *
 * This is intentionally simple for Fase 1: a per-process Map is enough to
 * deter casual abuse on a single-instance deployment. It resets on restart
 * and does not coordinate across instances — spec.md fase 4 moves this to
 * Redis once that becomes a real constraint (multi-instance deploys, more
 * traffic). Not a concern worth solving before it exists.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

let callsSinceSweep = 0;
const SWEEP_INTERVAL_CALLS = 500;

/** Drops entries with no requests left in the current window, bounding memory growth. */
function sweepStaleEntries(now: number): void {
  const windowStart = now - WINDOW_MS;
  for (const [key, entry] of store) {
    const hasRecent = entry.timestamps.some((t) => t > windowStart);
    if (!hasRecent) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Checks both the IP-scoped and (when authenticated) user-scoped limits
 * independently, returning whichever is exceeded first. IP-only was enough
 * while every request was anonymous; now that analyze/generate require
 * login, a signed-in abuser behind a shared/rotating IP wasn't meaningfully
 * throttled by IP alone.
 */
export function checkRequestRateLimit(clientIp: string, userId?: string | null): RateLimitResult {
  const ipResult = checkRateLimit(`ip:${clientIp}`);
  if (!ipResult.allowed) return ipResult;

  if (userId) {
    const userResult = checkRateLimit(`user:${userId}`);
    if (!userResult.allowed) return userResult;
  }

  return { allowed: true };
}

export function checkRateLimit(identifier: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const entry = store.get(identifier) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    store.set(identifier, entry);
    const oldestInWindow = entry.timestamps[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  entry.timestamps.push(now);
  store.set(identifier, entry);

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_INTERVAL_CALLS) {
    callsSinceSweep = 0;
    sweepStaleEntries(now);
  }

  return { allowed: true };
}
