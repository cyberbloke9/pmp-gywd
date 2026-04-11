import { NextRequest, NextResponse } from 'next/server';
import { fetchFromGateway } from '@/lib/config';

export const dynamic = 'force-dynamic';

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
  try {
    const body = await request.json();

    const config = await import('@/lib/config');
    const gatewayConfig = config.getGatewayConfig();
    const headers = config.getGatewayHeaders();

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
