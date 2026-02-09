import { NextRequest, NextResponse } from 'next/server';
import {
  getTimelineData,
  getHeatmapData,
  getPatternTypeDistribution,
  getExpertiseRadarData,
  getDecisionGraphData,
  getPhaseProgressByMilestone,
} from '@/lib/chart-data';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const chart = request.nextUrl.searchParams.get('chart') || 'all';

    if (chart === 'timeline') {
      return NextResponse.json({ success: true, data: getTimelineData() });
    }
    if (chart === 'heatmap') {
      return NextResponse.json({ success: true, data: getHeatmapData() });
    }
    if (chart === 'distribution') {
      return NextResponse.json({ success: true, data: getPatternTypeDistribution() });
    }
    if (chart === 'expertise') {
      return NextResponse.json({ success: true, data: getExpertiseRadarData() });
    }
    if (chart === 'decisions') {
      return NextResponse.json({ success: true, data: getDecisionGraphData() });
    }
    if (chart === 'milestones') {
      return NextResponse.json({ success: true, data: getPhaseProgressByMilestone() });
    }

    // Return all chart data
    return NextResponse.json({
      success: true,
      data: {
        timeline: getTimelineData(),
        heatmap: getHeatmapData(),
        distribution: getPatternTypeDistribution(),
        expertise: getExpertiseRadarData(),
        decisions: getDecisionGraphData(),
        milestones: getPhaseProgressByMilestone(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
