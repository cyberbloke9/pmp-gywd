import { NextResponse } from 'next/server';
import { parseState, getMemoryStats, parsePhases } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
      { status: 500 }
    );
  }
}
