import Header from '@/components/layout/Header';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusCards from '@/components/overview/StatusCards';
import ProgressSection from '@/components/overview/ProgressSection';
import PhaseTimeline from '@/components/overview/PhaseTimeline';
import MemorySummary from '@/components/overview/MemorySummary';
import { parseState, getMemoryStats, parsePhases } from '@/lib/gywd-bridge';

export const dynamic = 'force-dynamic';

export default function OverviewPage() {
  const state = parseState();
  const memoryStats = getMemoryStats();
  const phases = parsePhases();

  return (
    <DashboardLayout>
      <Header
        title="Overview"
        projectName="PMP-GYWD"
        phase={state.phase ? `Phase ${state.phase.current}/${state.phase.total}` : undefined}
        status={state.status || undefined}
      />

      <div className="p-6 space-y-6">
        <StatusCards state={state} />
        <ProgressSection state={state} memoryStats={memoryStats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PhaseTimeline
            phases={phases}
            currentPhase={state.phase?.current}
          />
          <MemorySummary stats={memoryStats} />
        </div>
      </div>
    </DashboardLayout>
  );
}
