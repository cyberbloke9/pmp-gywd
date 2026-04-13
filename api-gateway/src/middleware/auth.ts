import { Request, Response, NextFunction } from 'express';
import { validateKey } from '../lib/api-keys';

let authBypassWarned = false;

/**
 * Check if auth bypass is allowed.
 * GYWD_API_AUTH=disabled only works when NODE_ENV=development OR explicit
 * GYWD_API_AUTH_ALLOW_PRODUCTION_BYPASS=yes (operator opt-in for sandbox/test).
 */
function isAuthBypassAllowed(): boolean {
  if (process.env.GYWD_API_AUTH !== 'disabled') return false;

  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined;
  const explicitOptIn = process.env.GYWD_API_AUTH_ALLOW_PRODUCTION_BYPASS === 'yes';

  const allowed = isDev || explicitOptIn;

  if (allowed && !authBypassWarned) {
    authBypassWarned = true;
    // eslint-disable-next-line no-console
    console.warn(
      '\n⚠️  WARNING: GYWD_API_AUTH=disabled — gateway is UNAUTHENTICATED.\n' +
      `   NODE_ENV=${process.env.NODE_ENV || '(unset)'}\n` +
      '   This bypass MUST NOT be used on networked production deployments.\n',
    );
  } else if (!allowed && process.env.GYWD_API_AUTH === 'disabled' && !authBypassWarned) {
    authBypassWarned = true;
    // eslint-disable-next-line no-console
    console.error(
      '\n❌ GYWD_API_AUTH=disabled was IGNORED.\n' +
      '   Set NODE_ENV=development OR GYWD_API_AUTH_ALLOW_PRODUCTION_BYPASS=yes to enable.\n',
    );
  }

  return allowed;
}

// Exported for tests
export function _resetAuthWarning(): void {
  authBypassWarned = false;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for health check and docs
  if (req.path === '/health' || req.path === '/api/v1/docs') {
    next();
    return;
  }

  // Auth bypass — only in development or with explicit opt-in
  if (isAuthBypassAllowed()) {
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
