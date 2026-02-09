'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PatternTypeCount } from '@/lib/chart-data';

interface PatternDistributionProps {
  data: PatternTypeCount[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PatternTypeCount & { fill: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-gywd-surface border border-gywd-border rounded px-3 py-2 text-sm">
      <p className="font-medium text-gywd-text">{d.type}</p>
      <p className="text-gywd-muted">{d.count} patterns, avg confidence: {d.avgConfidence}</p>
    </div>
  );
}

export default function PatternDistribution({ data }: PatternDistributionProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gywd-muted">No patterns recorded yet</p>;
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="type"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => <span className="text-xs text-gywd-muted">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
