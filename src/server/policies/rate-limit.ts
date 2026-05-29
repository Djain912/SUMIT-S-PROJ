import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type EnforceRateLimitParams = {
  request: Request;
  key: string;
  maxRequests: number;
  windowMs: number;
  identifier?: string;
};

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown-ip';
}

// Lazily initialised so builds without Upstash env vars still succeed
let ratelimitCache: Map<string, Ratelimit> | null = null;

function getRatelimiter(key: string, maxRequests: number, windowMs: number): Ratelimit {
  if (!ratelimitCache) ratelimitCache = new Map();

  const cacheKey = `${key}:${maxRequests}:${windowMs}`;
  if (!ratelimitCache.has(cacheKey)) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    ratelimitCache.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
        prefix: key,
      }),
    );
  }
  return ratelimitCache.get(cacheKey)!;
}

export async function enforceRateLimit({
  request,
  key,
  maxRequests,
  windowMs,
  identifier,
}: EnforceRateLimitParams): Promise<RateLimitDecision> {
  const id = identifier ?? getClientIp(request);

  // Fallback if Upstash not configured (dev mode)
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { allowed: true, remaining: maxRequests, retryAfterSeconds: 0 };
  }

  const limiter = getRatelimiter(key, maxRequests, windowMs);
  const result = await limiter.limit(id);

  return {
    allowed: result.success,
    remaining: result.remaining,
    retryAfterSeconds: result.success ? 0 : Math.ceil((result.reset - Date.now()) / 1000),
  };
}
