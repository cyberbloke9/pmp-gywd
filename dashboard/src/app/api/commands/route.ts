import { NextRequest, NextResponse } from 'next/server';
import { fetchFromGateway, getGatewayConfig, getGatewayHeaders, isHostAllowed } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Get allowed origins from env (for CSRF protection on mutation endpoints) */
function getAllowedOrigins(): string[] {
  const fromEnv = (process.env.GYWD_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const defaults = [
    'http://localhost:3943',
    'http://127.0.0.1:3943',
  ];
  return [...defaults, ...fromEnv];
}

/**
 * Verify the request's Origin header is trusted.
 * Defends against CSRF where evil.com triggers state mutations.
 */
function isTrustedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowed = getAllowedOrigins();

  if (origin) {
    return allowed.some((a) => origin === a);
  }
  // Fall back to Referer if Origin absent (rare)
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      return allowed.some((a) => refOrigin === a);
    } catch { /* ignore */ }
  }
  // Neither header present — reject for POST (fetch() always sends Origin for cross-origin)
  return false;
}

/** GET /api/commands — List available GYWD commands (proxied from gateway) */
export async function GET() {
  try {
    const data = await fetchFromGateway<{ success: boolean; data: unknown }>('/api/v1/commands');
    if (data && data.success) {
      return NextResponse.json(data);
    }
    return NextResponse.json({
      success: true,
      data: { commands: [], total: 0, error: 'Gateway unavailable' },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

/** POST /api/commands — Execute a dashboard action (proxied to gateway) */
export async function POST(request: NextRequest) {
  // CSRF defense: verify trusted origin
  if (!isTrustedOrigin(request)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: untrusted origin' },
      { status: 403 },
    );
  }

  try {
    const gatewayConfig = getGatewayConfig();

    // SSRF defense
    if (!isHostAllowed(gatewayConfig.httpUrl)) {
      return NextResponse.json(
        { success: false, error: 'Gateway URL is not allowlisted' },
        { status: 502 },
      );
    }

    const body = await request.json();
    const headers = getGatewayHeaders();

    const response = await fetch(`${gatewayConfig.httpUrl}/api/v1/commands/execute`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Gateway unavailable: ${String(error)}` },
      { status: 502 },
    );
  }
}
