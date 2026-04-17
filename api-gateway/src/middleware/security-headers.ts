import { Request, Response, NextFunction } from 'express';

/**
 * Apply industry-standard security headers.
 * Minimal helmet-equivalent without adding a dependency.
 */
export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Legacy XSS protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Don't send referrer to other origins
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Cross-origin policies
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

  // Disable caching of authenticated responses by default
  // (routes can override with their own Cache-Control)
  if (!res.getHeader('Cache-Control')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }

  // HSTS — only meaningful over HTTPS, but safe to set
  if (process.env.GYWD_DISABLE_HSTS !== 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Basic CSP — permissive for an API (no HTML responses expected)
  // If serving HTML, override with a stricter policy upstream.
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");

  // Remove X-Powered-By (set elsewhere to disable)
  res.removeHeader('X-Powered-By');

  next();
}
