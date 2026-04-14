import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const DEFAULT_MAX = 100;
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute

export interface RateLimiterOptions {
  max?: number;
  windowMs?: number;
}

export function rateLimiter(options: RateLimiterOptions = {}) {
  const max = options.max || DEFAULT_MAX;
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting for health checks and tests
    if (req.path === '/health' || process.env.GYWD_DISABLE_RATE_LIMIT === 'true') {
      next();
      return;
    }

    const key = (req.headers['x-api-key'] as string) || req.ip || 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', max - 1);
      next();
      return;
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', retryAfter);
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Try again later.',
        retryAfter,
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - entry.count);
    next();
  };
}

/** Clear the rate limit store (for testing) */
export function clearRateLimitStore(): void {
  store.clear();
}
