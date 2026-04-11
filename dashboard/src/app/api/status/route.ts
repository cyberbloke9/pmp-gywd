import { NextResponse } from 'next/server';
import { fetchFromGateway } from '@/lib/config';
import { parseState, getMemoryStats, parsePhases } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try gateway first
    const gatewayData = await fetchFromGateway<{ success: boolean; data: unknown }>('/api/v1/status');
    if (gatewayData && gatewayData.success) {
      return NextResponse.json(gatewayData);
    }

    // Fallback to direct filesystem reads
    const state = parseState();
    const memoryStats = getMemoryStats();
    const phases = parsePhases();

    return NextResponse.json({
      success: true,
      data: { state, memoryStats, phases },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
