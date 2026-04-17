import { Request, Response, NextFunction } from 'express';

interface AuthedRequest extends Request {
  authContext?: { userId: string; scope: string; keyId: string; bypass?: boolean };
}

/**
 * Audit middleware — emits an audit entry for every authenticated request after response.
 * Skipped for /health, /api/v1/docs, and OPTIONS preflights.
 *
 * The app must attach an AuditLog instance to `app.locals.auditLog`.
 */
export function auditMiddleware(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS' || req.path === '/health' || req.path === '/api/v1/docs') {
    next();
    return;
  }

  // Capture start info
  const startedAt = Date.now();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || null;
  const ua = (req.headers['user-agent'] as string) || null;

  res.on('finish', () => {
    try {
      const auditLog = req.app.locals.auditLog;
      if (!auditLog || typeof auditLog.log !== 'function') return;

      const ctx = req.authContext;
      const outcome =
        res.statusCode >= 500 ? 'failure' :
        res.statusCode === 403 || res.statusCode === 401 ? 'denied' :
        'success';

      auditLog.log({
        userId: ctx?.userId || 'anonymous',
        action: `${req.method} ${req.path}`,
        resource: 'api_endpoint',
        resourceId: req.path,
        outcome,
        metadata: {
          status: res.statusCode,
          durationMs: Date.now() - startedAt,
          keyId: ctx?.keyId || null,
          scope: ctx?.scope || null,
          bypass: ctx?.bypass || false,
          userAgent: ua,
        },
        ip,
        sessionId: null,
      });
    } catch {
      // Never let audit failure break the response
    }
  });

  next();
}
