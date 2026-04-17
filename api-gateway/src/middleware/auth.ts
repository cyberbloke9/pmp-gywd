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

  // Auth bypass — only in development or with explicit opt-in.
  // In bypass mode, we populate authContext with 'admin' scope (so downstream
  // scope checks succeed) but mark it as bypass so audit logs can record that.
  if (isAuthBypassAllowed()) {
    (req as Request & { authContext?: unknown }).authContext = {
      userId: 'dev-bypass',
      scope: 'admin',
      keyId: 'bypass',
      bypass: true,
    };
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

  const info = validateKey(apiKey);
  if (!info) {
    res.status(403).json({
      success: false,
      error: 'Invalid or revoked API key.',
    });
    return;
  }

  // Attach auth context (includes scope for downstream authz)
  (req as Request & { authContext?: unknown; apiKeyName?: string }).authContext = {
    userId: info.createdBy || `key:${info.id}`,
    scope: info.scope,
    keyId: info.id,
    bypass: false,
  };
  (req as Request & { apiKeyName?: string }).apiKeyName = info.name;
  next();
}
