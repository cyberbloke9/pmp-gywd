import Card from '@/components/shared/Card';
import ProgressBar from '@/components/shared/ProgressBar';
import type { PlanningState, MemoryStats } from '@/lib/types';

interface ProgressSectionProps {
  state: PlanningState;
  memoryStats: MemoryStats;
}

export default function ProgressSection({ state, memoryStats }: ProgressSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <Card title="Overall Progress">
          <div className="space-y-4">
            <ProgressBar
              value={state.progress || 0}
              label="Project Completion"
              color="blue"
            />
            {state.milestone && (
              <p className="text-sm text-gywd-muted">
                Milestone: <span className="text-gywd-text">{state.milestone}</span>
              </p>
            )}
            {state.focus && (
              <p className="text-sm text-gywd-muted">
                Focus: <span className="text-gywd-text">{state.focus}</span>
              </p>
            )}
          </div>
        </Card>
      </div>

      <div>
        <Card title="Quick Stats">
          <div className="space-y-3">
            <StatRow label="Patterns" value={String(memoryStats.totalPatterns)} />
            <StatRow label="High Confidence" value={String(memoryStats.highConfidencePatterns)} />
            <StatRow label="Expertise Areas" value={String(memoryStats.expertiseAreas)} />
            <StatRow label="Projects" value={String(memoryStats.projectsCount)} />
            <StatRow label="Pattern Types" value={String(memoryStats.patternTypes.length)} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gywd-muted">{label}</span>
      <span className="text-gywd-text font-medium">{value}</span>
    </div>
  );
}
