import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import Card from '@/components/shared/Card';
import TimelineChart from '@/components/charts/TimelineChart';
import PatternHeatmap from '@/components/charts/PatternHeatmap';
import DecisionGraph from '@/components/charts/DecisionGraph';
import PatternDistribution from '@/components/charts/PatternDistribution';
import MilestoneProgress from '@/components/charts/MilestoneProgress';
import { parseState } from '@/lib/gywd-bridge';
import {
  getTimelineData,
  getHeatmapData,
  getPatternTypeDistribution,
  getDecisionGraphData,
  getPhaseProgressByMilestone,
} from '@/lib/chart-data';

export const dynamic = 'force-dynamic';

export default function ChartsPage() {
  const state = parseState();
  const timeline = getTimelineData();
  const heatmap = getHeatmapData();
  const distribution = getPatternTypeDistribution();
  const decisions = getDecisionGraphData();
  const milestones = getPhaseProgressByMilestone();

  return (
    <DashboardLayout>
      <Header
        title="Charts"
        projectName="PMP-GYWD"
        phase={state.phase ? `Phase ${state.phase.current}/${state.phase.total}` : undefined}
      />

      <div className="p-6 space-y-6">
        {/* Phase Timeline */}
        <Card title="Phase Timeline">
          <TimelineChart data={timeline} currentPhase={state.phase?.current} />
        </Card>

        {/* Milestone Progress */}
        <Card title="Milestone Progress">
          <MilestoneProgress data={milestones} />
        </Card>

        {/* Two-column: Heatmap + Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Pattern Confidence Heatmap">
            <PatternHeatmap
              cells={heatmap.cells}
              types={heatmap.types}
              buckets={heatmap.buckets}
            />
          </Card>
          <Card title="Pattern Type Distribution">
            <PatternDistribution data={distribution} />
          </Card>
        </div>

        {/* Decision Graph */}
        <Card title="Decision Graph">
          <DecisionGraph nodes={decisions.nodes} edges={decisions.edges} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
