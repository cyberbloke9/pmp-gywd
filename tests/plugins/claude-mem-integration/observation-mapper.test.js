'use strict';

/**
 * Observation Mapper Tests
 */

const { ObservationMapper, TOOL_TYPE_MAP, DEFAULT_TOOL_TYPE } = require('../../../lib/plugins/claude-mem-integration/observation-mapper');

describe('ObservationMapper', () => {
  let mapper;

  beforeEach(() => {
    mapper = new ObservationMapper({ initialConfidence: 0.6 });
  });

  describe('constructor', () => {
    it('should use default confidence when not provided', () => {
      const defaultMapper = new ObservationMapper();
      expect(defaultMapper.initialConfidence).toBe(0.6);
    });

    it('should use custom confidence when provided', () => {
      const customMapper = new ObservationMapper({ initialConfidence: 0.7 });
      expect(customMapper.initialConfidence).toBe(0.7);
    });

    it('should initialize stats', () => {
      expect(mapper.stats).toEqual({
        mapped: 0,
        skipped: 0,
        byType: {}
      });
    });
  });

  describe('toPattern', () => {
    it('should map observation with tool_name', () => {
      const observation = {
        id: 1,
        tool_name: 'Read',
        project: 'test-project',
        created_at: '2024-01-01T00:00:00Z'
      };

      const pattern = mapper.toPattern(observation);

      expect(pattern).not.toBeNull();
      expect(pattern.type).toBe('tool:read');
      expect(pattern.pattern).toBe('Read');
      expect(pattern.confidence).toBe(0.6);
      expect(pattern.occurrences).toBe(1);
      expect(pattern.sources).toContain('test-project');
      expect(pattern.metadata.source).toBe('claude-mem');
      expect(pattern.metadata.observationId).toBe(1);
    });

    it('should return null for observation without tool_name', () => {
      const observation = { id: 1 };
      const pattern = mapper.toPattern(observation);
      expect(pattern).toBeNull();
    });

    it('should return null for null observation', () => {
      const pattern = mapper.toPattern(null);
      expect(pattern).toBeNull();
    });

    it('should return null for undefined observation', () => {
      const pattern = mapper.toPattern(undefined);
      expect(pattern).toBeNull();
    });

    it('should increment skipped stat for unmappable observations', () => {
      mapper.toPattern(null);
      mapper.toPattern({});
      expect(mapper.stats.skipped).toBe(2);
    });

    it('should increment mapped stat for valid observations', () => {
      mapper.toPattern({ tool_name: 'Read' });
      mapper.toPattern({ tool_name: 'Write' });
      expect(mapper.stats.mapped).toBe(2);
    });

    it('should track stats by type', () => {
      mapper.toPattern({ tool_name: 'Read' });
      mapper.toPattern({ tool_name: 'Read' });
      mapper.toPattern({ tool_name: 'Write' });

      expect(mapper.stats.byType['tool:read']).toBe(2);
      expect(mapper.stats.byType['tool:write']).toBe(1);
    });

    it('should use "unknown" as default project', () => {
      const pattern = mapper.toPattern({ tool_name: 'Read' });
      expect(pattern.sources).toContain('unknown');
    });

    it('should generate unique IDs', () => {
      const pattern1 = mapper.toPattern({ tool_name: 'Read' });
      const pattern2 = mapper.toPattern({ tool_name: 'Read' });
      expect(pattern1.id).not.toBe(pattern2.id);
    });

    it('should use current date if created_at not provided', () => {
      const pattern = mapper.toPattern({ tool_name: 'Read' });
      expect(pattern.createdAt).toBeDefined();
      expect(pattern.lastSeen).toBeDefined();
    });
  });

  describe('toPatterns', () => {
    it('should map array of observations', () => {
      const observations = [
        { tool_name: 'Read' },
        { tool_name: 'Write' },
        { tool_name: 'Edit' }
      ];

      const patterns = mapper.toPatterns(observations);

      expect(patterns.length).toBe(3);
      expect(patterns[0].pattern).toBe('Read');
      expect(patterns[1].pattern).toBe('Write');
      expect(patterns[2].pattern).toBe('Edit');
    });

    it('should filter out null patterns', () => {
      const observations = [
        { tool_name: 'Read' },
        { id: 1 }, // No tool_name
        { tool_name: 'Write' }
      ];

      const patterns = mapper.toPatterns(observations);

      expect(patterns.length).toBe(2);
    });

    it('should return empty array for non-array input', () => {
      expect(mapper.toPatterns(null)).toEqual([]);
      expect(mapper.toPatterns(undefined)).toEqual([]);
      expect(mapper.toPatterns('string')).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(mapper.toPatterns([])).toEqual([]);
    });
  });

  describe('aggregate', () => {
    it('should aggregate patterns by type and tool', () => {
      const patterns = [
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj1'], confidence: 0.6, lastSeen: '2024-01-01' },
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj2'], confidence: 0.6, lastSeen: '2024-01-02' },
        { type: 'tool:write', pattern: 'Write', occurrences: 1, sources: ['proj1'], confidence: 0.6, lastSeen: '2024-01-01' }
      ];

      const aggregated = mapper.aggregate(patterns);

      expect(aggregated.length).toBe(2);

      const readPattern = aggregated.find(p => p.pattern === 'Read');
      expect(readPattern.occurrences).toBe(2);
      expect(readPattern.sources).toContain('proj1');
      expect(readPattern.sources).toContain('proj2');
    });

    it('should boost confidence on aggregation', () => {
      const patterns = [
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj1'], confidence: 0.6, lastSeen: '2024-01-01' },
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj2'], confidence: 0.6, lastSeen: '2024-01-02' }
      ];

      const aggregated = mapper.aggregate(patterns);
      const readPattern = aggregated.find(p => p.pattern === 'Read');

      expect(readPattern.confidence).toBeGreaterThan(0.6);
    });

    it('should cap confidence at 0.95', () => {
      const patterns = Array(100).fill(null).map(() => ({
        type: 'tool:read',
        pattern: 'Read',
        occurrences: 1,
        sources: ['proj'],
        confidence: 0.6,
        lastSeen: '2024-01-01'
      }));

      const aggregated = mapper.aggregate(patterns);
      const readPattern = aggregated.find(p => p.pattern === 'Read');

      expect(readPattern.confidence).toBeLessThanOrEqual(0.95);
    });

    it('should keep latest lastSeen date', () => {
      const patterns = [
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj1'], confidence: 0.6, lastSeen: '2024-01-01' },
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj2'], confidence: 0.6, lastSeen: '2024-01-15' }
      ];

      const aggregated = mapper.aggregate(patterns);
      const readPattern = aggregated.find(p => p.pattern === 'Read');

      expect(readPattern.lastSeen).toBe('2024-01-15');
    });

    it('should deduplicate sources', () => {
      const patterns = [
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj1'], confidence: 0.6, lastSeen: '2024-01-01' },
        { type: 'tool:read', pattern: 'Read', occurrences: 1, sources: ['proj1'], confidence: 0.6, lastSeen: '2024-01-02' }
      ];

      const aggregated = mapper.aggregate(patterns);
      const readPattern = aggregated.find(p => p.pattern === 'Read');

      expect(readPattern.sources.filter(s => s === 'proj1').length).toBe(1);
    });
  });

  describe('shouldMap', () => {
    it('should return true for valid tool names', () => {
      expect(mapper.shouldMap('Read')).toBe(true);
      expect(mapper.shouldMap('Write')).toBe(true);
      expect(mapper.shouldMap('CustomTool')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(mapper.shouldMap('')).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(mapper.shouldMap(null)).toBe(false);
      expect(mapper.shouldMap(undefined)).toBe(false);
      expect(mapper.shouldMap(123)).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return copy of stats', () => {
      mapper.toPattern({ tool_name: 'Read' });
      const stats = mapper.getStats();

      stats.mapped = 999; // Mutate copy

      expect(mapper.stats.mapped).toBe(1); // Original unchanged
    });
  });

  describe('resetStats', () => {
    it('should reset all stats', () => {
      mapper.toPattern({ tool_name: 'Read' });
      mapper.toPattern(null);

      mapper.resetStats();

      expect(mapper.stats).toEqual({
        mapped: 0,
        skipped: 0,
        byType: {}
      });
    });
  });

  describe('TOOL_TYPE_MAP', () => {
    it('should map Read to tool:read', () => {
      expect(TOOL_TYPE_MAP['Read']).toBe('tool:read');
    });

    it('should map Write to tool:write', () => {
      expect(TOOL_TYPE_MAP['Write']).toBe('tool:write');
    });

    it('should map Edit to tool:edit', () => {
      expect(TOOL_TYPE_MAP['Edit']).toBe('tool:edit');
    });

    it('should map Bash to tool:bash', () => {
      expect(TOOL_TYPE_MAP['Bash']).toBe('tool:bash');
    });

    it('should map Grep and Glob to tool:search', () => {
      expect(TOOL_TYPE_MAP['Grep']).toBe('tool:search');
      expect(TOOL_TYPE_MAP['Glob']).toBe('tool:search');
    });

    it('should map Task to tool:agent', () => {
      expect(TOOL_TYPE_MAP['Task']).toBe('tool:agent');
    });

    it('should map WebFetch and WebSearch to tool:web', () => {
      expect(TOOL_TYPE_MAP['WebFetch']).toBe('tool:web');
      expect(TOOL_TYPE_MAP['WebSearch']).toBe('tool:web');
    });

    it('should map LSP to tool:lsp', () => {
      expect(TOOL_TYPE_MAP['LSP']).toBe('tool:lsp');
    });

    it('should map NotebookEdit to tool:notebook', () => {
      expect(TOOL_TYPE_MAP['NotebookEdit']).toBe('tool:notebook');
    });

    it('should map AskUserQuestion to tool:interaction', () => {
      expect(TOOL_TYPE_MAP['AskUserQuestion']).toBe('tool:interaction');
    });

    it('should map Skill to tool:skill', () => {
      expect(TOOL_TYPE_MAP['Skill']).toBe('tool:skill');
    });
  });

  describe('static getToolTypeMap', () => {
    it('should return copy of tool type map', () => {
      const map = ObservationMapper.getToolTypeMap();
      expect(map).toEqual(TOOL_TYPE_MAP);

      map['NewTool'] = 'tool:new'; // Mutate copy
      expect(TOOL_TYPE_MAP['NewTool']).toBeUndefined(); // Original unchanged
    });
  });

  describe('static getPatternTypes', () => {
    it('should return all unique pattern types', () => {
      const types = ObservationMapper.getPatternTypes();

      expect(types).toContain('tool:read');
      expect(types).toContain('tool:write');
      expect(types).toContain('tool:edit');
      expect(types).toContain('tool:bash');
      expect(types).toContain('tool:search');
      expect(types).toContain('tool:agent');
      expect(types).toContain('tool:web');
      expect(types).toContain(DEFAULT_TOOL_TYPE);
    });

    it('should include default tool type', () => {
      const types = ObservationMapper.getPatternTypes();
      expect(types).toContain('tool:other');
    });
  });

  describe('DEFAULT_TOOL_TYPE', () => {
    it('should be tool:other', () => {
      expect(DEFAULT_TOOL_TYPE).toBe('tool:other');
    });
  });

  describe('unknown tool mapping', () => {
    it('should map unknown tools to default type', () => {
      const pattern = mapper.toPattern({ tool_name: 'UnknownTool' });
      expect(pattern.type).toBe('tool:other');
      expect(pattern.pattern).toBe('UnknownTool');
    });
  });
});
