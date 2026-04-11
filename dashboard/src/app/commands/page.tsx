'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import CommandList from '@/components/commands/CommandList';
import QuickActions from '@/components/commands/QuickActions';
import ExecutionLog from '@/components/commands/ExecutionLog';
import Skeleton from '@/components/shared/Skeleton';

interface Command {
  name: string;
  description: string;
  filename: string;
}

interface LogEntry {
  action: string;
  message: string;
  error?: string;
  timestamp: string;
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/commands')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.commands) {
          setCommands(data.data.commands);
        } else if (data.data?.error) {
          setError(data.data.error);
        }
      })
      .catch((err) => {
        setError(`Failed to load commands: ${String(err)}`);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleResult = (result: { action: string; message: string; error?: string }) => {
    setLog((prev) => [
      { ...result, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  };

  return (
    <DashboardLayout>
      <Header title="Commands" projectName="PMP-GYWD" />

      <div className="p-6 space-y-6">
        {/* Quick Actions + Execution Log */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QuickActions onResult={handleResult} />
          <ExecutionLog entries={log} />
        </div>

        {/* Command Reference */}
        {loading ? (
          <div className="bg-gywd-surface border border-gywd-border rounded-lg">
            <div className="px-4 py-3 border-b border-gywd-border">
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-gywd-surface border border-red-500/30 rounded-lg p-6 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <p className="text-xs text-gywd-muted mt-2">
              Make sure the API gateway is running on port 3945
            </p>
          </div>
        ) : (
          <CommandList
            commands={commands}
            onExecute={() => {}}
            executing={false}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
