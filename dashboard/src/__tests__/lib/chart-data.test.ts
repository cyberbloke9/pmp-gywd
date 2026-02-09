import * as fs from 'fs';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

import * as os from 'os';
import * as path from 'path';

const TEST_GLOBAL_DIR = path.join(os.tmpdir(), 'gywd-chart-test-global');
const TEST_PLANNING_DIR = path.join(os.tmpdir(), 'gywd-chart-test-planning');

process.env.GYWD_GLOBAL_DIR = TEST_GLOBAL_DIR;
process.env.GYWD_PLANNING_DIR = TEST_PLANNING_DIR;

import {
  getTimelineData,
  getHeatmapData,
  getPatternTypeDistribution,
  getExpertiseRadarData,
  getDecisionGraphData,
  getPhaseProgressByMilestone,
} from '@/lib/chart-data';

const STATE_CONTENT = `
# Project State

**Phase:** 44 of 52
**Status:** In Progress

| Phase | Title | Status |
|-------|-------|--------|
| 43 | Web Dashboard Core | Complete |
| 44 | Web Dashboard Charts | In Progress |
| 45 | API Gateway | Not Started |
`;

const PATTERNS = [
  { id: '1', type: 'naming', pattern: 'camelCase', confidence: 0.9, occurrences: 5, sources: ['a'], createdAt: '', lastSeen: '' },
  { id: '2', type: 'naming', pattern: 'snake_case', confidence: 0.3, occurrences: 1, sources: ['b'], createdAt: '', lastSeen: '' },
  { id: '3', type: 'structure', pattern: 'modular', confidence: 0.7, occurrences: 3, sources: ['a'], createdAt: '', lastSeen: '' },
  { id: '4', type: 'async', pattern: 'await', confidence: 0.5, occurrences: 2, sources: ['c'], createdAt: '', lastSeen: '' },
];

const EXPERTISE = {
  backend: { level: 0.85, observations: 5, lastUpdated: '2026-02-01' },
  frontend: { level: 0.6, observations: 3, lastUpdated: '2026-02-01' },
  devops: { level: 0.4, observations: 2, lastUpdated: '2026-02-01' },
};

function setupMocks() {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
    const p = String(filePath);
    if (p.includes('STATE.md')) return STATE_CONTENT;
    if (p.includes('patterns.json')) return JSON.stringify(PATTERNS);
    if (p.includes('expertise.json')) return JSON.stringify(EXPERTISE);
    if (p.includes('preferences.json')) return '{}';
    if (p.includes('projects.json')) return '[]';
    return '{}';
  });
}

describe('chart-data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('getTimelineData', () => {
    it('returns timeline points from phases', () => {
      const data = getTimelineData();
      expect(data).toHaveLength(3);
      expect(data[0].phase).toBe(43);
      expect(data[0].status).toBe('Complete');
      expect(data[0].fill).toBe('#22c55e');
    });

    it('colors In Progress phases amber', () => {
      const data = getTimelineData();
      const inProgress = data.find(d => d.phase === 44);
      expect(inProgress?.fill).toBe('#f59e0b');
    });

    it('colors Not Started phases dark', () => {
      const data = getTimelineData();
      const notStarted = data.find(d => d.phase === 45);
      expect(notStarted?.fill).toBe('#334155');
    });

    it('returns empty array when no phases', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getTimelineData()).toEqual([]);
    });
  });

  describe('getHeatmapData', () => {
    it('returns cells, types, and buckets', () => {
      const data = getHeatmapData();
      expect(data.types).toContain('naming');
      expect(data.types).toContain('structure');
      expect(data.buckets).toHaveLength(5);
      expect(data.cells.length).toBe(data.types.length * 5);
    });

    it('calculates normalized intensity', () => {
      const data = getHeatmapData();
      const maxCell = data.cells.reduce((max, c) => c.count > max.count ? c : max, data.cells[0]);
      expect(maxCell.intensity).toBe(1);
    });

    it('handles empty patterns', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const p = String(filePath);
        if (p.includes('patterns.json')) return '[]';
        if (p.includes('STATE.md')) return STATE_CONTENT;
        return '{}';
      });
      const data = getHeatmapData();
      expect(data.types).toHaveLength(0);
      expect(data.cells).toHaveLength(0);
    });
  });

  describe('getPatternTypeDistribution', () => {
    it('returns type counts sorted by count', () => {
      const dist = getPatternTypeDistribution();
      expect(dist[0].type).toBe('naming');
      expect(dist[0].count).toBe(2);
    });

    it('calculates average confidence', () => {
      const dist = getPatternTypeDistribution();
      const naming = dist.find(d => d.type === 'naming');
      expect(naming?.avgConfidence).toBe(0.6); // (0.9 + 0.3) / 2
    });

    it('returns empty array for no patterns', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const p = String(filePath);
        if (p.includes('patterns.json')) return '[]';
        if (p.includes('STATE.md')) return STATE_CONTENT;
        return '{}';
      });
      expect(getPatternTypeDistribution()).toHaveLength(0);
    });
  });

  describe('getExpertiseRadarData', () => {
    it('returns expertise points sorted by level', () => {
      const data = getExpertiseRadarData();
      expect(data[0].domain).toBe('backend');
      expect(data[0].level).toBe(85);
    });

    it('converts level to percentage', () => {
      const data = getExpertiseRadarData();
      const frontend = data.find(d => d.domain === 'frontend');
      expect(frontend?.level).toBe(60);
    });

    it('returns empty for no expertise', () => {
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const p = String(filePath);
        if (p.includes('expertise.json')) return '{}';
        if (p.includes('STATE.md')) return STATE_CONTENT;
        if (p.includes('patterns.json')) return '[]';
        return '{}';
      });
      expect(getExpertiseRadarData()).toHaveLength(0);
    });
  });

  describe('getDecisionGraphData', () => {
    it('returns nodes and edges', () => {
      const graph = getDecisionGraphData();
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('each node has id, label, rationale', () => {
      const { nodes } = getDecisionGraphData();
      for (const node of nodes) {
        expect(node.id).toBeTruthy();
        expect(node.label).toBeTruthy();
        expect(node.rationale).toBeTruthy();
      }
    });

    it('edges reference valid node ids', () => {
      const { nodes, edges } = getDecisionGraphData();
      const ids = new Set(nodes.map(n => n.id));
      for (const edge of edges) {
        expect(ids.has(edge.source)).toBe(true);
        expect(ids.has(edge.target)).toBe(true);
      }
    });
  });

  describe('getPhaseProgressByMilestone', () => {
    it('returns milestone progress bars', () => {
      const data = getPhaseProgressByMilestone();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].milestone).toBeTruthy();
    });

    it('calculates percentage correctly', () => {
      const data = getPhaseProgressByMilestone();
      for (const m of data) {
        expect(m.percent).toBe(Math.round((m.completed / m.total) * 100));
      }
    });

    it('v5.0 milestone includes phase 43 as complete', () => {
      const data = getPhaseProgressByMilestone();
      const v5 = data.find(d => d.milestone === 'v5.0');
      expect(v5?.completed).toBeGreaterThanOrEqual(1);
    });
  });
});
