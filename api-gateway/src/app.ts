import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limiter';
import statusRouter from './routes/status';
import memoryRouter from './routes/memory';
import patternsRouter from './routes/patterns';
import planningRouter from './routes/planning';
import keysRouter from './routes/keys';
import commandsRouter from './routes/commands';
import { openapiSpec } from './lib/openapi-spec';

export function createApp() {
  const app = express();

  // Core middleware
  app.use(cors());
  app.use(express.json());
  app.use(rateLimiter({ max: 100, windowMs: 60000 }));

  // Health check (no auth)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // OpenAPI docs (no auth)
  app.get('/api/v1/docs', (_req, res) => {
    res.json(openapiSpec);
  });

  // Auth middleware for all /api routes
  app.use('/api', authMiddleware);

  // API routes
  app.use('/api/v1/status', statusRouter);
  app.use('/api/v1/memory', memoryRouter);
  app.use('/api/v1/patterns', patternsRouter);
  app.use('/api/v1/planning', planningRouter);
  app.use('/api/v1/keys', keysRouter);

  // Stricter rate limit for mutation endpoints (20/min vs 100/min general)
  app.use('/api/v1/commands', rateLimiter({ max: 20, windowMs: 60000 }), commandsRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}
