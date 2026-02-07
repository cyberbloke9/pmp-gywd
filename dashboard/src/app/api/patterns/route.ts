import { NextResponse } from 'next/server';
import { classifyPatterns } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const classified = classifyPatterns();

    return NextResponse.json({
      success: true,
      data: classified,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
