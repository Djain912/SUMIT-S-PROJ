type Bucket = {
  timestamps: number[];
};

type EnforceRateLimitParams = {
  request: Request;
  key: string;
  maxRequests: number;
  windowMs: number;
  identifier?: string;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const store = new Map<string, Bucket>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(',');
    return firstIp.trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown-ip';
}

function getClientIdentifier(request: Request, explicitIdentifier?: string) {
  if (explicitIdentifier) {
    return explicitIdentifier;
  }

  return getClientIp(request);
}

export function enforceRateLimit({ request, key, maxRequests, windowMs, identifier }: EnforceRateLimitParams): RateLimitDecision {
  const now = Date.now();
  const clientIdentifier = getClientIdentifier(request, identifier);
  const bucketKey = `${key}:${clientIdentifier}`;

  const existing = store.get(bucketKey) ?? { timestamps: [] };
  const validWindowStart = now - windowMs;
  existing.timestamps = existing.timestamps.filter((timestamp) => timestamp >= validWindowStart);

  if (existing.timestamps.length >= maxRequests) {
    const oldestTimestamp = existing.timestamps[0];
    const retryAfterMs = oldestTimestamp + windowMs - now;

    store.set(bucketKey, existing);

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  existing.timestamps.push(now);
  store.set(bucketKey, existing);

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - existing.timestamps.length),
    retryAfterSeconds: 0,
  };
}
