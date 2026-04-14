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
  id: string;
  action: string;
  message: string;
  error?: string;
  timestamp: string;
}

const LOG_STORAGE_KEY = 'gywd.execution-log.v1';
const LOG_MAX_ENTRIES = 100;

function loadLogFromStorage(): LogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, LOG_MAX_ENTRIES) as LogEntry[];
  } catch {
    return [];
  }
}

function saveLogToStorage(entries: LogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(entries.slice(0, LOG_MAX_ENTRIES)));
  } catch {
    // Quota exceeded or disabled — silently drop
  }
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [logLoaded, setLogLoaded] = useState(false);

  // Load persisted log on mount
  useEffect(() => {
    setLog(loadLogFromStorage());
    setLogLoaded(true);
  }, []);

  // Persist log on change (after initial load)
  useEffect(() => {
    if (logLoaded) saveLogToStorage(log);
  }, [log, logLoaded]);

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
    setLog((prev) => {
      const entry: LogEntry = {
        id: nextId(),
        ...result,
        timestamp: new Date().toISOString(),
      };
      return [entry, ...prev].slice(0, LOG_MAX_ENTRIES);
    });
  };

  const handleClearLog = () => {
    setLog([]);
  };

  return (
    <DashboardLayout>
      <Header title="Commands" projectName="PMP-GYWD" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QuickActions onResult={handleResult} />
          <ExecutionLog entries={log} onClear={handleClearLog} />
        </div>

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
          <CommandList commands={commands} />
        )}
      </div>
    </DashboardLayout>
  );
}
