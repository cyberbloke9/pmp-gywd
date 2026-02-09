'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { ExpertisePoint } from '@/lib/chart-data';

interface ExpertiseRadarProps {
  data: ExpertisePoint[];
}

export default function ExpertiseRadar({ data }: ExpertiseRadarProps) {
  if (data.length === 0) {
    return <p className="text-sm text-gywd-muted">No expertise data recorded</p>;
  }

  // Recharts radar needs at least 3 points
  const chartData = data.length >= 3 ? data : [...data, ...Array(3 - data.length).fill({ domain: '', level: 0, observations: 0 })];

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#334155" />
          <PolarAngleAxis
            dataKey="domain"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: '#64748b', fontSize: 9 }}
            tickCount={4}
          />
          <Radar
            name="Expertise"
            dataKey="level"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#e2e8f0',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value}%`, 'Level']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
