import Card from '@/components/shared/Card';
import Badge from '@/components/shared/Badge';
import type { PhaseEntry } from '@/lib/types';

interface PhaseTimelineProps {
  phases: PhaseEntry[];
  currentPhase?: number;
}

function getStatusVariant(status: string): 'green' | 'amber' | 'muted' | 'blue' {
  if (status.toLowerCase().includes('complete')) return 'green';
  if (status.toLowerCase().includes('progress')) return 'amber';
  if (status.toLowerCase().includes('started')) return 'blue';
  return 'muted';
}

export default function PhaseTimeline({ phases, currentPhase }: PhaseTimelineProps) {
  return (
    <Card title="Phase Timeline">
      <div className="space-y-2">
        {phases.length === 0 ? (
          <p className="text-sm text-gywd-muted">No phases found</p>
        ) : (
          phases.map((phase) => {
            const isCurrent = phase.number === currentPhase;
            return (
              <div
                key={phase.number}
                className={`flex items-center justify-between py-2 px-3 rounded ${
                  isCurrent ? 'bg-gywd-blue/5 border border-gywd-blue/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-gywd-muted w-6">
                    {phase.number}
                  </span>
                  <span className={`text-sm ${isCurrent ? 'text-gywd-text font-medium' : 'text-gywd-muted'}`}>
                    {phase.title}
                  </span>
                </div>
                <Badge label={phase.status} variant={getStatusVariant(phase.status)} />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
