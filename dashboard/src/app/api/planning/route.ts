import { NextRequest, NextResponse } from 'next/server';
import { getRoadmap, parseState, parsePhases } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const file = request.nextUrl.searchParams.get('file') || 'state';

    if (file === 'roadmap') {
      const roadmap = getRoadmap();
      return NextResponse.json({
        success: true,
        data: { content: roadmap },
      });
    }

    if (file === 'phases') {
      const phases = parsePhases();
      return NextResponse.json({
        success: true,
        data: { phases },
      });
    }

    // Default: state
    const state = parseState();
    return NextResponse.json({
      success: true,
      data: { state },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
