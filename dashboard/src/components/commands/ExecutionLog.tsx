'use client';

import Card from '@/components/shared/Card';

interface LogEntry {
  action: string;
  message: string;
  error?: string;
  timestamp: string;
}

interface ExecutionLogProps {
  entries: LogEntry[];
}

export default function ExecutionLog({ entries }: ExecutionLogProps) {
  if (entries.length === 0) {
    return (
      <Card title="Execution Log">
        <p className="text-sm text-gywd-muted text-center py-6">
          No actions executed yet. Use Quick Actions above to get started.
        </p>
      </Card>
    );
  }

  return (
    <Card title={`Execution Log (${entries.length})`}>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {entries.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={`px-3 py-2 rounded-md border text-sm ${
              entry.error
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-gywd-green/30 bg-gywd-green/5'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-gywd-text">{entry.action}</span>
              <span className="text-xs text-gywd-muted">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${entry.error ? 'text-red-400' : 'text-gywd-green'}`}>
              {entry.error || entry.message}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
