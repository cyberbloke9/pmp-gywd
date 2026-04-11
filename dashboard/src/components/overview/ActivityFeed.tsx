'use client';

import { useState, useEffect, useRef } from 'react';
import Card from '@/components/shared/Card';

interface FeedEntry {
  id: string;
  type: string;
  message: string;
  detail?: string;
  timestamp: string;
}

const EVENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  state_changed: { icon: '📋', color: 'text-gywd-blue', label: 'State Changed' },
  patterns_updated: { icon: '🧩', color: 'text-purple-400', label: 'Patterns Updated' },
  data_updated: { icon: '📂', color: 'text-gywd-muted', label: 'Data Updated' },
  command_executed: { icon: '🎮', color: 'text-gywd-green', label: 'Command Executed' },
  connected: { icon: '🔗', color: 'text-gywd-green', label: 'Connected' },
  heartbeat: { icon: '💓', color: 'text-gywd-muted', label: 'Heartbeat' },
};

const MAX_ENTRIES = 50;

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return iso;
  }
}

function eventToEntry(type: string, data: unknown): FeedEntry {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const timestamp = new Date().toISOString();
  let message = '';
  let detail: string | undefined;

  const d = data as Record<string, unknown>;

  switch (type) {
    case 'state_changed': {
      const state = d.state as Record<string, unknown> | undefined;
      if (state?.phase) {
        const phase = state.phase as { current: number; total: number };
        message = `Phase ${phase.current}/${phase.total}`;
      } else {
        message = 'State updated';
      }
      if (state?.status) detail = String(state.status);
      break;
    }
    case 'patterns_updated':
      message = `${d.count ?? '?'} patterns`;
      break;
    case 'command_executed':
      message = String(d.action || 'Unknown action');
      detail = String(d.result || '');
      break;
    case 'data_updated':
      message = String(d.file || 'File changed').split('/').pop() || 'File changed';
      break;
    case 'connected':
      message = `Source: ${d.source || 'unknown'}`;
      break;
    default:
      message = type;
  }

  return { id, type, message, detail, timestamp };
}

export default function ActivityFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [showHeartbeats, setShowHeartbeats] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/stream');
    eventSourceRef.current = es;

    function handleEvent(type: string) {
      return (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (type === 'connected') {
            setConnected(true);
          }
          setEntries((prev) => {
            const entry = eventToEntry(type, data);
            const next = [entry, ...prev];
            return next.slice(0, MAX_ENTRIES);
          });
        } catch {
          // Ignore parse errors
        }
      };
    }

    es.addEventListener('connected', handleEvent('connected'));
    es.addEventListener('state_changed', handleEvent('state_changed'));
    es.addEventListener('patterns_updated', handleEvent('patterns_updated'));
    es.addEventListener('data_updated', handleEvent('data_updated'));
    es.addEventListener('command_executed', handleEvent('command_executed'));
    es.addEventListener('heartbeat', handleEvent('heartbeat'));

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 5s
      setTimeout(() => {
        eventSourceRef.current = null;
      }, 5000);
    };

    return () => {
      es.close();
    };
  }, []);

  const visibleEntries = showHeartbeats
    ? entries
    : entries.filter((e) => e.type !== 'heartbeat');

  return (
    <Card title="Activity Feed">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? 'bg-gywd-green' : 'bg-gywd-red'}`}
          />
          <span className="text-xs text-gywd-muted">
            {connected ? 'Live' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={() => setShowHeartbeats(!showHeartbeats)}
          className="text-xs text-gywd-muted hover:text-gywd-text transition-colors"
        >
          {showHeartbeats ? 'Hide' : 'Show'} heartbeats
        </button>
      </div>

      <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
        {visibleEntries.length === 0 && (
          <p className="text-sm text-gywd-muted text-center py-6">
            {connected ? 'Waiting for events...' : 'Connecting to event stream...'}
          </p>
        )}

        {visibleEntries.map((entry) => {
          const config = EVENT_CONFIG[entry.type] || { icon: '?', color: 'text-gywd-muted', label: entry.type };

          return (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-gywd-bg/50 transition-colors"
            >
              <span className="text-sm mt-0.5 shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                  <span className="text-xs text-gywd-muted">{formatTime(entry.timestamp)}</span>
                </div>
                <p className="text-xs text-gywd-text truncate">{entry.message}</p>
                {entry.detail && (
                  <p className="text-xs text-gywd-muted truncate">{entry.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
