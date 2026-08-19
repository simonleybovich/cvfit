import { describe, expect, it, vi } from "vitest";

import { createRateLimiter, type RateLimitRedisClient } from "./rate-limit";

class FakeRedis implements RateLimitRedisClient {
  private readonly windows = new Map<string, number[]>();
  shouldFail = false;

  async eval(_script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown> {
    if (this.shouldFail) throw new Error("Redis unavailable");

    const now = Number(options.arguments[0]);
    const windowMs = Number(options.arguments[1]);
    const limit = Number(options.arguments[2]);
    const key = options.keys[0];
    const timestamps = (this.windows.get(key) ?? []).filter((timestamp) => timestamp > now - windowMs);

    if (timestamps.length >= limit) {
      this.windows.set(key, timestamps);
      return [0, timestamps[0] + windowMs - now];
    }

    timestamps.push(now);
    this.windows.set(key, timestamps);
    return [1, 0];
  }
}

describe("Redis-backed rate limiter", () => {
  it("enforces an atomic sliding window and resets after the window", async () => {
    let now = 1_000;
    const redis = new FakeRedis();
    const limiter = createRateLimiter({ redisClient: redis, now: () => now });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(limiter.checkRateLimit("ip:127.0.0.1")).resolves.toEqual({ allowed: true });
    }
    await expect(limiter.checkRateLimit("ip:127.0.0.1")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });

    now += 60_000;
    await expect(limiter.checkRateLimit("ip:127.0.0.1")).resolves.toEqual({ allowed: true });
  });

  it("keeps IP and authenticated-user limits independent", async () => {
    const redis = new FakeRedis();
    const limiter = createRateLimiter({ redisClient: redis, now: () => 1_000 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(limiter.checkRequestRateLimit(`10.0.0.${attempt}`, "user-1")).resolves.toEqual({ allowed: true });
    }
    await expect(limiter.checkRequestRateLimit("10.0.0.5", "user-1")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
  });

  it("falls back to the in-memory window when Redis fails", async () => {
    const redis = new FakeRedis();
    redis.shouldFail = true;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const limiter = createRateLimiter({ redisClient: redis, now: () => 1_000 });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(limiter.checkRateLimit("ip:127.0.0.1")).resolves.toEqual({ allowed: true });
    }
    await expect(limiter.checkRateLimit("ip:127.0.0.1")).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(errorSpy).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});
