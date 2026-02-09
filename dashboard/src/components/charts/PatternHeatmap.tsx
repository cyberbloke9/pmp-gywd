'use client';

import type { HeatmapCell } from '@/lib/chart-data';

interface PatternHeatmapProps {
  cells: HeatmapCell[];
  types: string[];
  buckets: string[];
}

function getColor(intensity: number): string {
  if (intensity === 0) return '#1e293b';
  if (intensity < 0.25) return '#1e3a5f';
  if (intensity < 0.5) return '#1d4ed8';
  if (intensity < 0.75) return '#3b82f6';
  return '#60a5fa';
}

export default function PatternHeatmap({ cells, types, buckets }: PatternHeatmapProps) {
  if (types.length === 0) {
    return <p className="text-sm text-gywd-muted">No patterns recorded yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left text-gywd-muted text-xs font-normal pb-2 pr-3">Type</th>
            {buckets.map((b) => (
              <th key={b} className="text-center text-gywd-muted text-xs font-normal pb-2 px-1">
                {b}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type}>
              <td className="text-gywd-muted text-xs py-1 pr-3 whitespace-nowrap">{type}</td>
              {buckets.map((bucket) => {
                const cell = cells.find(c => c.type === type && c.bucket === bucket);
                return (
                  <td key={bucket} className="px-1 py-1">
                    <div
                      className="w-full h-7 rounded-sm flex items-center justify-center text-xs"
                      style={{ backgroundColor: getColor(cell?.intensity || 0) }}
                      title={`${type} ${bucket}: ${cell?.count || 0} patterns`}
                    >
                      {cell && cell.count > 0 ? (
                        <span className="text-white/80">{cell.count}</span>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
