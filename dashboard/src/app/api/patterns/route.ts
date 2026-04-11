import { NextResponse } from 'next/server';
import { fetchFromGateway } from '@/lib/config';
import { classifyPatterns } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Try gateway first
    const gatewayData = await fetchFromGateway<{ success: boolean; data: unknown }>('/api/v1/patterns');
    if (gatewayData && gatewayData.success) {
      return NextResponse.json(gatewayData);
    }

    // Fallback to direct filesystem reads
    const classified = classifyPatterns();

    return NextResponse.json({
      success: true,
      data: classified,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
