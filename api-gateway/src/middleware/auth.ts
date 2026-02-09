import { Request, Response, NextFunction } from 'express';
import { validateKey } from '../lib/api-keys';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health check and docs
  if (req.path === '/health' || req.path === '/api/v1/docs') {
    next();
    return;
  }

  // Check for development mode bypass
  if (process.env.GYWD_API_AUTH === 'disabled') {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'Missing API key. Set X-API-Key header.',
    });
    return;
  }

  const entry = validateKey(apiKey);
  if (!entry) {
    res.status(403).json({
      success: false,
      error: 'Invalid or revoked API key.',
    });
    return;
  }

  // Attach key info to request for downstream use
  (req as Request & { apiKeyName?: string }).apiKeyName = entry.name;
  next();
}
