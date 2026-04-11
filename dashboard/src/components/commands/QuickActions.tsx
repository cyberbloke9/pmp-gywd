'use client';

import { useState } from 'react';
import Card from '@/components/shared/Card';

interface ActionResult {
  action: string;
  message: string;
  data?: unknown;
  error?: string;
}

interface QuickActionsProps {
  onResult: (result: ActionResult) => void;
}

const ACTIONS = [
  {
    id: 'refresh-state',
    label: 'Refresh State',
    description: 'Re-read STATE.md and broadcast updates',
    icon: '🔄',
  },
  {
    id: 'refresh-patterns',
    label: 'Refresh Patterns',
    description: 'Re-read patterns.json and broadcast updates',
    icon: '🧩',
  },
];

export default function QuickActions({ onResult }: QuickActionsProps) {
  const [executing, setExecuting] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const execute = async (actionId: string) => {
    setConfirmAction(null);
    setExecuting(actionId);

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionId }),
      });

      const data = await response.json();

      if (data.success) {
        onResult({ action: actionId, message: data.data?.message || 'Success', data: data.data });
      } else {
        onResult({ action: actionId, message: 'Failed', error: data.error });
      }
    } catch (err) {
      onResult({ action: actionId, message: 'Failed', error: String(err) });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <Card title="Quick Actions">
      <div className="space-y-2">
        {ACTIONS.map((action) => (
          <div key={action.id} className="relative">
            <button
              onClick={() => setConfirmAction(action.id)}
              disabled={executing !== null}
              className="w-full text-left px-3 py-2.5 rounded-md border border-gywd-border hover:border-gywd-blue/50 hover:bg-gywd-blue/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              <span className="text-lg">{action.icon}</span>
              <div className="flex-1">
                <span className="text-sm font-medium text-gywd-text">{action.label}</span>
                <p className="text-xs text-gywd-muted">{action.description}</p>
              </div>
              {executing === action.id && (
                <span className="text-xs text-gywd-blue animate-pulse">Running...</span>
              )}
            </button>

            {/* Confirmation dialog */}
            {confirmAction === action.id && (
              <div className="absolute inset-0 bg-gywd-surface/95 border border-gywd-border rounded-md flex items-center justify-center gap-2 px-4 z-10">
                <span className="text-xs text-gywd-muted">Execute {action.label}?</span>
                <button
                  onClick={() => execute(action.id)}
                  className="px-3 py-1 text-xs bg-gywd-blue text-white rounded hover:bg-gywd-blue/80 transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-3 py-1 text-xs bg-gywd-border text-gywd-text rounded hover:bg-gywd-muted/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
