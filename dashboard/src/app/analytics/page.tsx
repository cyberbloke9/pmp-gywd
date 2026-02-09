import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import Card from '@/components/shared/Card';
import ProgressBar from '@/components/shared/ProgressBar';
import ExpertiseRadar from '@/components/charts/ExpertiseRadar';
import MilestoneProgress from '@/components/charts/MilestoneProgress';
import { parseState, getMemoryStats } from '@/lib/gywd-bridge';
import { getExpertiseRadarData, getPhaseProgressByMilestone } from '@/lib/chart-data';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  const state = parseState();
  const memoryStats = getMemoryStats();
  const expertise = getExpertiseRadarData();
  const milestones = getPhaseProgressByMilestone();

  const totalPhases = 52;
  const completedPhases = milestones.reduce((sum, m) => sum + m.completed, 0);
  const testCount = 855;

  return (
    <DashboardLayout>
      <Header
        title="Analytics"
        projectName="PMP-GYWD"
        phase={state.phase ? `Phase ${state.phase.current}/${state.phase.total}` : undefined}
      />

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-gywd-blue">{completedPhases}</p>
              <p className="text-xs text-gywd-muted mt-1">Phases Complete</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-gywd-green">{testCount}</p>
              <p className="text-xs text-gywd-muted mt-1">Tests Passing</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-gywd-amber">{memoryStats.totalPatterns}</p>
              <p className="text-xs text-gywd-muted mt-1">Patterns Learned</p>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <p className="text-3xl font-bold text-gywd-purple">{memoryStats.expertiseAreas}</p>
              <p className="text-xs text-gywd-muted mt-1">Expertise Areas</p>
            </div>
          </Card>
        </div>

        {/* Progress + Expertise */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Milestone Progress">
            <MilestoneProgress data={milestones} />
          </Card>
          <Card title="Expertise Radar">
            <ExpertiseRadar data={expertise} />
          </Card>
        </div>

        {/* Health Metrics */}
        <Card title="Project Health">
          <div className="space-y-4">
            <ProgressBar
              value={completedPhases}
              max={totalPhases}
              label="Phase Completion"
              color="blue"
            />
            <ProgressBar
              value={memoryStats.highConfidencePatterns}
              max={Math.max(memoryStats.totalPatterns, 1)}
              label="Pattern Confidence"
              color="green"
            />
            <ProgressBar
              value={testCount}
              max={1000}
              label="Test Coverage Target"
              color="purple"
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
