'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { PhaseProgressBar } from '@/lib/chart-data';

interface MilestoneProgressProps {
  data: PhaseProgressBar[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PhaseProgressBar }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gywd-surface border border-gywd-border rounded px-3 py-2 text-sm">
      <p className="font-medium text-gywd-text">{d.milestone}</p>
      <p className="text-gywd-muted">{d.completed}/{d.total} phases ({d.percent}%)</p>
    </div>
  );
}

export default function MilestoneProgress({ data }: MilestoneProgressProps) {
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 50 }}>
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="milestone"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#334155', opacity: 0.3 }} />
          <Bar dataKey="percent" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.percent === 100 ? '#22c55e' : entry.percent > 0 ? '#3b82f6' : '#334155'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
