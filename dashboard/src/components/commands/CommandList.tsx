'use client';

import { useState } from 'react';
import Card from '@/components/shared/Card';

interface Command {
  name: string;
  description: string;
  filename: string;
}

interface CommandListProps {
  commands: Command[];
  onExecute: (action: string) => void;
  executing: boolean;
}

export default function CommandList({ commands, onExecute, executing }: CommandListProps) {
  const [search, setSearch] = useState('');
  const [expandedCmd, setExpandedCmd] = useState<string | null>(null);

  const filtered = commands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(search.toLowerCase()) ||
      cmd.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Card title={`Commands (${filtered.length})`}>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search commands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 bg-gywd-bg border border-gywd-border rounded-md text-sm text-gywd-text placeholder:text-gywd-muted/50 focus:outline-none focus:ring-1 focus:ring-gywd-blue"
        />
      </div>

      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {filtered.map((cmd) => (
          <div
            key={cmd.name}
            className="group rounded-md border border-transparent hover:border-gywd-border hover:bg-gywd-bg/50 transition-colors"
          >
            <button
              className="w-full text-left px-3 py-2 flex items-center justify-between"
              onClick={() => setExpandedCmd(expandedCmd === cmd.name ? null : cmd.name)}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-mono text-gywd-blue">/{cmd.name}</span>
                <p className="text-xs text-gywd-muted truncate mt-0.5">{cmd.description}</p>
              </div>
              <span className="text-gywd-muted text-xs ml-2">
                {expandedCmd === cmd.name ? '▲' : '▼'}
              </span>
            </button>

            {expandedCmd === cmd.name && (
              <div className="px-3 pb-3 border-t border-gywd-border/50 mt-1 pt-2">
                <p className="text-xs text-gywd-muted mb-2">
                  This is a Claude Code slash command. It requires Claude Code to execute interactively.
                </p>
                <code className="block text-xs bg-gywd-bg px-2 py-1 rounded text-gywd-text font-mono">
                  /{cmd.name}
                </code>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-gywd-muted text-center py-4">No commands match your search</p>
        )}
      </div>
    </Card>
  );
}
