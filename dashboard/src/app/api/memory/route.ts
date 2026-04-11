import { NextRequest, NextResponse } from 'next/server';
import { fetchFromGateway } from '@/lib/config';
import { getPatterns, getExpertise, getPreferences, getProjects } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const section = request.nextUrl.searchParams.get('section') || 'all';

    // Try gateway first
    const gatewayData = await fetchFromGateway<{ success: boolean; data: unknown }>(
      `/api/v1/memory?section=${section}`,
    );
    if (gatewayData && gatewayData.success) {
      return NextResponse.json(gatewayData);
    }

    // Fallback to direct filesystem reads
    const data: Record<string, unknown> = {};

    if (section === 'all' || section === 'patterns') {
      data.patterns = getPatterns();
    }
    if (section === 'all' || section === 'expertise') {
      data.expertise = getExpertise();
    }
    if (section === 'all' || section === 'preferences') {
      data.preferences = getPreferences();
    }
    if (section === 'all' || section === 'projects') {
      data.projects = getProjects();
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
