'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Header from '@/components/layout/Header';
import CommandList from '@/components/commands/CommandList';
import QuickActions from '@/components/commands/QuickActions';
import ExecutionLog from '@/components/commands/ExecutionLog';

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
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => {
    fetch('/api/commands')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.commands) {
          setCommands(data.data.commands);
        }
      })
      .catch(() => {
        // Gateway unavailable
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
          <div className="bg-gywd-surface border border-gywd-border rounded-lg p-8 text-center">
            <p className="text-sm text-gywd-muted animate-pulse">Loading commands...</p>
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
