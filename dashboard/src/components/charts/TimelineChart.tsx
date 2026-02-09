'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import type { TimelinePoint } from '@/lib/chart-data';

interface TimelineChartProps {
  data: TimelinePoint[];
  currentPhase?: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: TimelinePoint }> }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="bg-gywd-surface border border-gywd-border rounded px-3 py-2 text-sm">
      <p className="font-medium text-gywd-text">Phase {point.phase}</p>
      <p className="text-gywd-muted">{point.title}</p>
      <p className="text-xs mt-1" style={{ color: point.fill }}>{point.status}</p>
    </div>
  );
}

export default function TimelineChart({ data, currentPhase }: TimelineChartProps) {
  // Each phase is a bar with height 1, colored by status
  const chartData = data.map((d) => ({
    ...d,
    value: 1,
    isCurrent: d.phase === currentPhase,
  }));

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <XAxis
            dataKey="phase"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.fill}
                stroke={entry.isCurrent ? '#3b82f6' : 'transparent'}
                strokeWidth={entry.isCurrent ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
