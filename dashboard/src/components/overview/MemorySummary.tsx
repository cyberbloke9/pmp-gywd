import Card from '@/components/shared/Card';
import ProgressBar from '@/components/shared/ProgressBar';
import type { MemoryStats } from '@/lib/types';

interface MemorySummaryProps {
  stats: MemoryStats;
}

export default function MemorySummary({ stats }: MemorySummaryProps) {
  const confidenceRate = stats.totalPatterns > 0
    ? Math.round((stats.highConfidencePatterns / stats.totalPatterns) * 100)
    : 0;

  return (
    <Card title="Memory Summary">
      <div className="space-y-4">
        <ProgressBar
          value={confidenceRate}
          label="Pattern Confidence Rate"
          color="green"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gywd-bg rounded">
            <p className="text-xl font-bold text-gywd-blue">{stats.totalPatterns}</p>
            <p className="text-xs text-gywd-muted">Patterns</p>
          </div>
          <div className="text-center p-2 bg-gywd-bg rounded">
            <p className="text-xl font-bold text-gywd-green">{stats.expertiseAreas}</p>
            <p className="text-xs text-gywd-muted">Expertise</p>
          </div>
        </div>

        {stats.patternTypes.length > 0 && (
          <div>
            <p className="text-xs text-gywd-muted mb-2">Pattern Types</p>
            <div className="flex flex-wrap gap-1">
              {stats.patternTypes.map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 text-xs bg-gywd-bg rounded text-gywd-muted"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
