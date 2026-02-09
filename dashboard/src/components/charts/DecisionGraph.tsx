'use client';

import type { DecisionNode, DecisionEdge } from '@/lib/chart-data';

interface DecisionGraphProps {
  nodes: DecisionNode[];
  edges: DecisionEdge[];
}

// Simple force-directed-like layout using predefined positions
function layoutNodes(nodes: DecisionNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const cellW = 160;
  const cellH = 80;

  nodes.forEach((node, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.set(node.id, {
      x: 40 + col * cellW + cellW / 2,
      y: 30 + row * cellH + cellH / 2,
    });
  });

  return positions;
}

export default function DecisionGraph({ nodes, edges }: DecisionGraphProps) {
  if (nodes.length === 0) {
    return <p className="text-sm text-gywd-muted">No decisions recorded</p>;
  }

  const positions = layoutNodes(nodes);
  const cols = Math.ceil(Math.sqrt(nodes.length));
  const rows = Math.ceil(nodes.length / cols);
  const svgW = 40 + cols * 160 + 40;
  const svgH = 30 + rows * 80 + 30;

  return (
    <div className="overflow-x-auto">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} className="min-w-[400px]">
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = positions.get(edge.source);
          const to = positions.get(edge.target);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#334155"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const pos = positions.get(node.id);
          if (!pos) return null;
          return (
            <g key={node.id}>
              <rect
                x={pos.x - 60}
                y={pos.y - 18}
                width={120}
                height={36}
                rx={6}
                fill="#1e293b"
                stroke="#3b82f6"
                strokeWidth={1}
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#e2e8f0"
                fontSize={10}
              >
                {node.label}
              </text>
              <title>{node.rationale}</title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
