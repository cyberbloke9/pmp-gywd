import { Request, Response, NextFunction } from 'express';
import { rateLimiter, clearRateLimitStore } from '../../middleware/rate-limiter';

function createMocks(path = '/api/v1/status', apiKey = 'test-key') {
  const req = {
    path,
    headers: { 'x-api-key': apiKey },
    ip: '127.0.0.1',
  } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('rateLimiter', () => {
  beforeEach(() => clearRateLimitStore());

  it('allows requests under limit', () => {
    const limiter = rateLimiter({ max: 5, windowMs: 60000 });
    const { req, res, next } = createMocks();
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 4);
  });

  it('blocks requests over limit', () => {
    const limiter = rateLimiter({ max: 2, windowMs: 60000 });
    for (let i = 0; i < 3; i++) {
      const { req, res, next } = createMocks();
      limiter(req, res, next);
      if (i < 2) {
        expect(next).toHaveBeenCalled();
      } else {
        expect(res.status).toHaveBeenCalledWith(429);
      }
    }
  });

  it('skips health check', () => {
    const limiter = rateLimiter({ max: 1, windowMs: 60000 });
    const { req, res, next } = createMocks('/health');
    limiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('sets rate limit headers', () => {
    const limiter = rateLimiter({ max: 10, windowMs: 60000 });
    const { req, res, next } = createMocks();
    limiter(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 10);
  });

  it('tracks different keys separately', () => {
    const limiter = rateLimiter({ max: 1, windowMs: 60000 });

    const { req: req1, res: res1, next: next1 } = createMocks('/api/v1/status', 'key-a');
    limiter(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    const { req: req2, res: res2, next: next2 } = createMocks('/api/v1/status', 'key-b');
    limiter(req2, res2, next2);
    expect(next2).toHaveBeenCalled();
  });
});
