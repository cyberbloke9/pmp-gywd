import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Set env vars before importing bridge
const TEST_GLOBAL_DIR = path.join(os.tmpdir(), 'gywd-test-global');
const TEST_PLANNING_DIR = path.join(os.tmpdir(), 'gywd-test-planning');

process.env.GYWD_GLOBAL_DIR = TEST_GLOBAL_DIR;
process.env.GYWD_PLANNING_DIR = TEST_PLANNING_DIR;

import {
  getPatterns,
  getExpertise,
  getPreferences,
  getProjects,
  getMemoryStats,
  classifyPatterns,
  parseState,
  parsePhases,
  getRoadmap,
  getWatchPaths,
  getGlobalDir,
  getPlanningDir,
} from '@/lib/gywd-bridge';

describe('gywd-bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('path resolution', () => {
    it('returns global dir from env', () => {
      expect(getGlobalDir()).toBe(TEST_GLOBAL_DIR);
    });

    it('returns planning dir from env', () => {
      expect(getPlanningDir()).toBe(TEST_PLANNING_DIR);
    });
  });

  describe('getPatterns', () => {
    it('returns empty array when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getPatterns()).toEqual([]);
    });

    it('returns parsed patterns from JSON file', () => {
      const patterns = [
        { id: 'gp-1', type: 'naming', pattern: 'camelCase', confidence: 0.9, occurrences: 5, sources: ['project-a'], createdAt: '2026-01-01', lastSeen: '2026-02-01' },
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(patterns));
      expect(getPatterns()).toEqual(patterns);
    });

    it('returns empty array on parse error', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('not json');
      expect(getPatterns()).toEqual([]);
    });
  });

  describe('getExpertise', () => {
    it('returns empty object when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getExpertise()).toEqual({});
    });

    it('returns parsed expertise', () => {
      const expertise = {
        backend: { level: 0.8, observations: 3, lastUpdated: '2026-02-01' },
      };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(expertise));
      expect(getExpertise()).toEqual(expertise);
    });
  });

  describe('getPreferences', () => {
    it('returns empty object when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getPreferences()).toEqual({});
    });

    it('returns parsed preferences', () => {
      const prefs = { theme: { value: 'dark', updatedAt: '2026-02-01' } };
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(prefs));
      expect(getPreferences()).toEqual(prefs);
    });
  });

  describe('getProjects', () => {
    it('returns empty array when file does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getProjects()).toEqual([]);
    });

    it('returns parsed projects', () => {
      const projects = [
        { path: '/home/user/project', name: 'project', metadata: {}, registeredAt: '2026-01-01', lastAccessed: '2026-02-01', accessCount: 5 },
      ];
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(projects));
      expect(getProjects()).toEqual(projects);
    });
  });

  describe('getMemoryStats', () => {
    it('returns stats from memory files', () => {
      const patterns = [
        { id: '1', type: 'naming', pattern: 'a', confidence: 0.9, occurrences: 1, sources: [], createdAt: '', lastSeen: '' },
        { id: '2', type: 'structure', pattern: 'b', confidence: 0.5, occurrences: 1, sources: [], createdAt: '', lastSeen: '' },
        { id: '3', type: 'naming', pattern: 'c', confidence: 0.8, occurrences: 1, sources: [], createdAt: '', lastSeen: '' },
      ];
      const expertise = { backend: { level: 0.8, observations: 1, lastUpdated: '' } };
      const prefs = { theme: { value: 'dark', updatedAt: '' } };
      const projects = [{ path: '/a', name: 'a', metadata: {}, registeredAt: '', lastAccessed: '', accessCount: 1 }];

      // Mock fs to return different data per path
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const p = String(filePath);
        if (p.includes('patterns')) return JSON.stringify(patterns);
        if (p.includes('expertise')) return JSON.stringify(expertise);
        if (p.includes('preferences')) return JSON.stringify(prefs);
        if (p.includes('projects')) return JSON.stringify(projects);
        return '{}';
      });

      const stats = getMemoryStats();
      expect(stats.totalPatterns).toBe(3);
      expect(stats.patternTypes).toEqual(expect.arrayContaining(['naming', 'structure']));
      expect(stats.expertiseAreas).toBe(1);
      expect(stats.preferencesCount).toBe(1);
      expect(stats.projectsCount).toBe(1);
      expect(stats.highConfidencePatterns).toBe(2);
    });
  });

  describe('classifyPatterns', () => {
    it('classifies patterns by confidence and occurrences', () => {
      const patterns = [
        { id: '1', type: 'a', pattern: 'consensus', confidence: 0.9, occurrences: 5, sources: [], createdAt: '', lastSeen: '' },
        { id: '2', type: 'b', pattern: 'emerging', confidence: 0.5, occurrences: 2, sources: [], createdAt: '', lastSeen: '' },
        { id: '3', type: 'c', pattern: 'outlier', confidence: 0.2, occurrences: 1, sources: [], createdAt: '', lastSeen: '' },
      ];

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify(patterns));

      const classified = classifyPatterns();
      expect(classified.consensus).toHaveLength(1);
      expect(classified.consensus[0].pattern).toBe('consensus');
      expect(classified.emerging).toHaveLength(1);
      expect(classified.emerging[0].pattern).toBe('emerging');
      expect(classified.outlier).toHaveLength(1);
      expect(classified.outlier[0].pattern).toBe('outlier');
    });
  });

  describe('parseState', () => {
    it('returns empty state when STATE.md does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      const state = parseState();
      expect(state.phase).toBeNull();
      expect(state.milestone).toBeNull();
      expect(state.focus).toBeNull();
    });

    it('parses phase info from STATE.md', () => {
      const content = `# Project State
**Current milestone:** v5.0 Connected Intelligence
**Focus:** Phase 43 - Web Dashboard Core

## Current Position

**Phase:** 43 of 52
**Status:** Not Started

**Progress:** [████████░░] 81% overall (42/52 phases complete)

Last activity: 2026-02-04 - Completed v4.1

| Metric | Value |
|--------|-------|
| Version | v4.1.0 (current), v5.0.0 (target) |
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(content);

      const state = parseState();
      expect(state.phase).toEqual({ current: 43, total: 52 });
      expect(state.milestone).toBe('v5.0 Connected Intelligence');
      expect(state.focus).toBe('Phase 43 - Web Dashboard Core');
      expect(state.status).toBe('Not Started');
      expect(state.progress).toBe(81);
      expect(state.version).toBe('4.1.0');
      expect(state.lastActivity).toBe('2026-02-04');
    });

    it('handles partial STATE.md content', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('**Phase:** 10 of 20\n');

      const state = parseState();
      expect(state.phase).toEqual({ current: 10, total: 20 });
      expect(state.milestone).toBeNull();
    });
  });

  describe('parsePhases', () => {
    it('returns empty array when STATE.md does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(parsePhases()).toEqual([]);
    });

    it('parses phase table from STATE.md', () => {
      const content = `
| Phase | Title | Status |
|-------|-------|--------|
| 43 | Web Dashboard Core | Not Started |
| 44 | Web Dashboard Charts | Not Started |
| 45 | API Gateway | Not Started |
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(content);

      const phases = parsePhases();
      expect(phases).toHaveLength(3);
      expect(phases[0]).toEqual({ number: 43, title: 'Web Dashboard Core', status: 'Not Started' });
      expect(phases[2]).toEqual({ number: 45, title: 'API Gateway', status: 'Not Started' });
    });
  });

  describe('getRoadmap', () => {
    it('returns null when ROADMAP.md does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(getRoadmap()).toBeNull();
    });

    it('returns roadmap content', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('# Roadmap\nSome content');
      expect(getRoadmap()).toBe('# Roadmap\nSome content');
    });
  });

  describe('getWatchPaths', () => {
    it('returns paths for all watched files', () => {
      const paths = getWatchPaths();
      expect(paths).toHaveLength(5);
      expect(paths[0]).toContain('STATE.md');
      expect(paths[1]).toContain('patterns.json');
      expect(paths[2]).toContain('expertise.json');
      expect(paths[3]).toContain('preferences.json');
      expect(paths[4]).toContain('projects.json');
    });
  });
});
