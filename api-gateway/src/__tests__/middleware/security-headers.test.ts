import { securityHeaders } from '../../middleware/security-headers';
import { Request, Response } from 'express';

function makeRes() {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    setHeader: jest.fn((name: string, value: string | number | readonly string[]) => {
      headers[name] = String(value);
      return res as Response;
    }) as unknown as Response['setHeader'],
    getHeader: jest.fn((name: string) => headers[name]) as unknown as Response['getHeader'],
    removeHeader: jest.fn((name: string) => { delete headers[name]; }) as unknown as Response['removeHeader'],
  };
  return { res: res as Response, headers };
}

describe('securityHeaders middleware', () => {
  test('sets X-Content-Type-Options: nosniff', () => {
    const { res, headers } = makeRes();
    const next = jest.fn();
    securityHeaders({} as Request, res, next);
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  test('sets X-Frame-Options: DENY', () => {
    const { res, headers } = makeRes();
    securityHeaders({} as Request, res, jest.fn());
    expect(headers['X-Frame-Options']).toBe('DENY');
  });

  test('sets Referrer-Policy', () => {
    const { res, headers } = makeRes();
    securityHeaders({} as Request, res, jest.fn());
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
  });

  test('sets Cross-Origin-* headers', () => {
    const { res, headers } = makeRes();
    securityHeaders({} as Request, res, jest.fn());
    expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(headers['Cross-Origin-Resource-Policy']).toBe('same-site');
  });

  test('sets no-store Cache-Control by default', () => {
    const { res, headers } = makeRes();
    securityHeaders({} as Request, res, jest.fn());
    expect(headers['Cache-Control']).toContain('no-store');
  });

  test('sets CSP restricting default-src to none', () => {
    const { res, headers } = makeRes();
    securityHeaders({} as Request, res, jest.fn());
    expect(headers['Content-Security-Policy']).toContain("default-src 'none'");
    expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  });

  test('sets HSTS by default', () => {
    const { res, headers } = makeRes();
    securityHeaders({} as Request, res, jest.fn());
    expect(headers['Strict-Transport-Security']).toContain('max-age=31536000');
  });

  test('omits HSTS when GYWD_DISABLE_HSTS=true', () => {
    const orig = process.env.GYWD_DISABLE_HSTS;
    process.env.GYWD_DISABLE_HSTS = 'true';
    try {
      const { res, headers } = makeRes();
      securityHeaders({} as Request, res, jest.fn());
      expect(headers['Strict-Transport-Security']).toBeUndefined();
    } finally {
      if (orig === undefined) delete process.env.GYWD_DISABLE_HSTS;
      else process.env.GYWD_DISABLE_HSTS = orig;
    }
  });

  test('calls next()', () => {
    const { res } = makeRes();
    const next = jest.fn();
    securityHeaders({} as Request, res, next);
    expect(next).toHaveBeenCalled();
  });
});
