import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limiter';
import { securityHeaders } from './middleware/security-headers';
import { auditMiddleware } from './middleware/audit';
import statusRouter from './routes/status';
import memoryRouter from './routes/memory';
import patternsRouter from './routes/patterns';
import planningRouter from './routes/planning';
import keysRouter from './routes/keys';
import commandsRouter from './routes/commands';
import { openapiSpec } from './lib/openapi-spec';

/**
 * Parse GYWD_ALLOWED_ORIGINS env var into a list, with safe defaults.
 * Falls back to localhost on common ports if nothing is set.
 */
function getAllowedOrigins(): string[] | true {
  const fromEnv = (process.env.GYWD_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  // In development allow common dashboard ports (never in production)
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
    return [
      'http://localhost:3000',
      'http://localhost:3943',
      'http://127.0.0.1:3943',
    ];
  }

  // Production default: NO origins unless explicitly configured
  // (cross-origin requests will be rejected)
  return [];
}

export function createApp() {
  const app = express();

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Security headers — apply to all responses
  app.use(securityHeaders);

  // CORS allowlist (no more `*` default)
  const allowedOrigins = getAllowedOrigins();
  app.use(cors({
    origin: (origin, callback) => {
      // Allow same-origin (no Origin header) and allowlisted origins
      if (!origin) return callback(null, true);
      if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin "${origin}" not allowlisted`));
    },
    credentials: false, // API keys via header; no cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key'],
    maxAge: 600,
  }));

  // Body parser with limits to prevent DoS
  app.use(express.json({
    limit: '100kb',
    strict: true, // reject non-object/array at top level
  }));

  // Global rate limit (lenient — 100/min)
  app.use(rateLimiter({ max: 100, windowMs: 60000 }));

  // Health check (no auth, no audit)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // OpenAPI docs (no auth)
  app.get('/api/v1/docs', (_req, res) => {
    res.json(openapiSpec);
  });

  // Auth middleware — populates req.authContext for /api routes
  app.use('/api', authMiddleware);

  // Audit middleware — logs every authenticated request after response
  app.use('/api', auditMiddleware);

  // API routes
  app.use('/api/v1/status', statusRouter);
  app.use('/api/v1/memory', memoryRouter);
  app.use('/api/v1/patterns', patternsRouter);
  app.use('/api/v1/planning', planningRouter);

  // Stricter rate limit for mutation endpoints (20/min vs 100/min general)
  app.use('/api/v1/keys', rateLimiter({ max: 20, windowMs: 60000 }), keysRouter);
  app.use('/api/v1/commands', rateLimiter({ max: 20, windowMs: 60000 }), commandsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Error handler — sanitized error messages
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    // Don't leak error.message verbatim to client in production (may include paths)
    const safeMessage = process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;
    // Log internally with full detail (without secret headers)
    // eslint-disable-next-line no-console
    console.error('[gateway] Unhandled error:', err.message);
    res.status(500).json({ success: false, error: safeMessage });
  });

  return app;
}
