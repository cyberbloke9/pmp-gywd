import {
  getPatterns,
  getExpertise,
  parsePhases,
  parseState,
} from './gywd-bridge';
import type { Pattern, PhaseEntry, ExpertiseEntry } from './types';

// ==================== Timeline Data ====================

export interface TimelinePoint {
  phase: number;
  title: string;
  status: string;
  fill: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Complete': '#22c55e',
  'In Progress': '#f59e0b',
  'Not Started': '#334155',
};

export function getTimelineData(): TimelinePoint[] {
  const phases = parsePhases();
  return phases.map((p) => ({
    phase: p.number,
    title: p.title,
    status: p.status,
    fill: STATUS_COLORS[p.status] || STATUS_COLORS['Not Started'],
  }));
}

// ==================== Pattern Heatmap Data ====================

export interface HeatmapCell {
  type: string;
  bucket: string;
  count: number;
  intensity: number;
}

const CONFIDENCE_BUCKETS = [
  { label: '0-0.2', min: 0, max: 0.2 },
  { label: '0.2-0.4', min: 0.2, max: 0.4 },
  { label: '0.4-0.6', min: 0.4, max: 0.6 },
  { label: '0.6-0.8', min: 0.6, max: 0.8 },
  { label: '0.8-1.0', min: 0.8, max: 1.01 },
];

export function getHeatmapData(): { cells: HeatmapCell[]; types: string[]; buckets: string[] } {
  const patterns = getPatterns();
  const types = [...new Set(patterns.map(p => p.type))];
  const buckets = CONFIDENCE_BUCKETS.map(b => b.label);

  const cells: HeatmapCell[] = [];
  let maxCount = 0;

  for (const type of types) {
    for (const bucket of CONFIDENCE_BUCKETS) {
      const count = patterns.filter(
        p => p.type === type && p.confidence >= bucket.min && p.confidence < bucket.max
      ).length;
      if (count > maxCount) maxCount = count;
      cells.push({ type, bucket: bucket.label, count, intensity: 0 });
    }
  }

  // Normalize intensity 0-1
  if (maxCount > 0) {
    for (const cell of cells) {
      cell.intensity = cell.count / maxCount;
    }
  }

  return { cells, types, buckets };
}

// ==================== Pattern Type Distribution ====================

export interface PatternTypeCount {
  type: string;
  count: number;
  avgConfidence: number;
}

export function getPatternTypeDistribution(): PatternTypeCount[] {
  const patterns = getPatterns();
  const typeMap = new Map<string, { count: number; totalConf: number }>();

  for (const p of patterns) {
    const entry = typeMap.get(p.type) || { count: 0, totalConf: 0 };
    entry.count++;
    entry.totalConf += p.confidence;
    typeMap.set(p.type, entry);
  }

  return Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      avgConfidence: Math.round((data.totalConf / data.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);
}

// ==================== Expertise Radar Data ====================

export interface ExpertisePoint {
  domain: string;
  level: number;
  observations: number;
}

export function getExpertiseRadarData(): ExpertisePoint[] {
  const expertise = getExpertise();
  return Object.entries(expertise)
    .map(([domain, data]: [string, ExpertiseEntry]) => ({
      domain,
      level: Math.round(data.level * 100),
      observations: data.observations,
    }))
    .sort((a, b) => b.level - a.level);
}

// ==================== Decision Graph Data ====================

export interface DecisionNode {
  id: string;
  label: string;
  rationale: string;
}

export interface DecisionEdge {
  source: string;
  target: string;
}

export function getDecisionGraphData(): { nodes: DecisionNode[]; edges: DecisionEdge[] } {
  const state = parseState();

  // Parse decisions from STATE.md key decisions table
  // For now, return static decisions from the project
  const nodes: DecisionNode[] = [
    { id: 'jest', label: 'Jest for testing', rationale: 'Industry standard' },
    { id: 'zero-deps', label: 'Zero runtime deps', rationale: 'Lightweight install' },
    { id: 'modular', label: 'Modular lib arch', rationale: 'Separation of concerns' },
    { id: 'agents', label: 'Agent pattern', rationale: 'Composable autonomous ops' },
    { id: 'plugins', label: 'Plugin system', rationale: 'Extensibility' },
    { id: 'sse', label: 'SSE over WebSockets', rationale: 'claude-mem uses SSE' },
    { id: 'nextjs', label: 'Next.js dashboard', rationale: 'React + SSR + API routes' },
    { id: 'batch-sync', label: 'Batch sync', rationale: 'Overflow protection' },
  ];

  const edges: DecisionEdge[] = [
    { source: 'modular', target: 'agents' },
    { source: 'modular', target: 'plugins' },
    { source: 'agents', target: 'plugins' },
    { source: 'sse', target: 'batch-sync' },
    { source: 'nextjs', target: 'sse' },
    { source: 'jest', target: 'zero-deps' },
  ];

  return { nodes, edges };
}

// ==================== Phase Progress Summary ====================

export interface PhaseProgressBar {
  milestone: string;
  completed: number;
  total: number;
  percent: number;
}

export function getPhaseProgressByMilestone(): PhaseProgressBar[] {
  const phases = parsePhases();

  const milestones: { name: string; range: [number, number] }[] = [
    { name: 'v1.0-v3.2', range: [1, 9] },
    { name: 'v3.3', range: [10, 18] },
    { name: 'v3.4', range: [19, 28] },
    { name: 'v4.0', range: [29, 40] },
    { name: 'v4.1', range: [41, 42] },
    { name: 'v5.0', range: [43, 52] },
  ];

  return milestones.map((m) => {
    const inRange = phases.filter(p => p.number >= m.range[0] && p.number <= m.range[1]);
    const completed = inRange.filter(p => p.status.toLowerCase().includes('complete')).length;
    const total = m.range[1] - m.range[0] + 1;
    return {
      milestone: m.name,
      completed,
      total,
      percent: Math.round((completed / total) * 100),
    };
  });
}
