import { randomUUID } from "node:crypto";

import { createClient } from "redis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const REDIS_KEY_PREFIX = "cvfit:rate-limit:";
const REDIS_RETRY_DELAY_MS = 30_000;

const RATE_LIMIT_SCRIPT = `
local window_start = tonumber(ARGV[1]) - tonumber(ARGV[2])
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local ttl_seconds = tonumber(ARGV[4])

redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, window_start)
local count = redis.call("ZCARD", KEYS[1])
if count >= limit then
  local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
  local retry_after_ms = tonumber(oldest[2]) + window_ms - now
  redis.call("EXPIRE", KEYS[1], ttl_seconds)
  return { 0, retry_after_ms }
end

redis.call("ZADD", KEYS[1], now, ARGV[5])
redis.call("EXPIRE", KEYS[1], ttl_seconds)
return { 1, 0 }
`;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

export interface RateLimitRedisClient {
  eval(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
}

export interface RateLimiterOptions {
  redisClient?: RateLimitRedisClient | null;
  now?: () => number;
}

interface RateLimitEntry {
  timestamps: number[];
}

function createInMemoryFallback(now: () => number) {
  const store = new Map<string, RateLimitEntry>();

  return (identifier: string): RateLimitResult => {
    const currentTime = now();
    const windowStart = currentTime - WINDOW_MS;
    const entry = store.get(identifier) ?? { timestamps: [] };
    entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > windowStart);

    if (entry.timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
      store.set(identifier, entry);
      const oldestInWindow = entry.timestamps[0];
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((oldestInWindow + WINDOW_MS - currentTime) / 1000)),
      };
    }

    entry.timestamps.push(currentTime);
    store.set(identifier, entry);
    return { allowed: true };
  };
}

function createRedisClientProvider(): () => Promise<RateLimitRedisClient | null> {
  let client: RateLimitRedisClient | null = null;
  let connecting: Promise<RateLimitRedisClient | null> | null = null;
  let unavailableUntil = 0;

  return async () => {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl || Date.now() < unavailableUntil) return client;
    if (client) return client;
    if (connecting) return connecting;

    const redisClient = createClient({ url: redisUrl, socket: { connectTimeout: 1_000 } });
    redisClient.on("error", (error) => {
      console.error("[rate-limit] Redis error; using in-memory fallback:", error);
    });
    connecting = redisClient
      .connect()
      .then(() => {
        client = redisClient;
        connecting = null;
        return client;
      })
      .catch((error) => {
        unavailableUntil = Date.now() + REDIS_RETRY_DELAY_MS;
        connecting = null;
        console.error("[rate-limit] Redis unavailable; using in-memory fallback:", error);
        return null;
      });

    return connecting;
  };
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const now = options.now ?? Date.now;
  const fallback = createInMemoryFallback(now);
  const getRedisClient = options.redisClient === undefined
    ? createRedisClientProvider()
    : async () => options.redisClient ?? null;
  let redisUnavailableUntil = 0;

  async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
    const currentTime = now();
    let redisClient: RateLimitRedisClient | null = null;

    if (currentTime >= redisUnavailableUntil) {
      redisClient = await getRedisClient();
    }

    if (redisClient) {
      try {
        const result = await redisClient.eval(RATE_LIMIT_SCRIPT, {
          keys: [`${REDIS_KEY_PREFIX}${identifier}`],
          arguments: [
            String(currentTime),
            String(WINDOW_MS),
            String(MAX_REQUESTS_PER_WINDOW),
            String(Math.ceil(WINDOW_MS / 1000)),
            `${currentTime}-${randomUUID()}`,
          ],
        });
        const values = Array.isArray(result) ? result : [];
        if (Number(values[0]) === 1) return { allowed: true };
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil(Number(values[1]) / 1000)),
        };
      } catch (error) {
        redisUnavailableUntil = currentTime + REDIS_RETRY_DELAY_MS;
        console.error("[rate-limit] Redis command failed; using in-memory fallback:", error);
      }
    }

    return fallback(identifier);
  }

  async function checkRequestRateLimit(clientIp: string, userId?: string | null): Promise<RateLimitResult> {
    const ipResult = await checkRateLimit(`ip:${clientIp}`);
    if (!ipResult.allowed) return ipResult;

    if (userId) {
      const userResult = await checkRateLimit(`user:${userId}`);
      if (!userResult.allowed) return userResult;
    }

    return { allowed: true };
  }

  return { checkRateLimit, checkRequestRateLimit };
}

const defaultRateLimiter = createRateLimiter();

export const checkRateLimit = defaultRateLimiter.checkRateLimit;
export const checkRequestRateLimit = defaultRateLimiter.checkRequestRateLimit;
