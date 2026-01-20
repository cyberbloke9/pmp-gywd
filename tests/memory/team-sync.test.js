'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  GlobalMemory,
  TeamSync,
  CONFLICT_STRATEGIES,
  EXPORT_VERSION,
} = require('../../lib/memory');

describe('TeamSync', () => {
  let globalMemory;
  let sync;
  let testDir;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `gywd-sync-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create mock global memory with in-memory storage
    const mockStorage = {
      patterns: [],
      expertise: {},
      preferences: {},
      projects: [],
    };

    globalMemory = new GlobalMemory();
    globalMemory._ensureDirectories = () => {};
    globalMemory._loadFile = (filePath, defaultValue) => {
      const name = path.basename(filePath, '.json');
      if (name === 'patterns') return mockStorage.patterns;
      if (name === 'expertise') return mockStorage.expertise;
      if (name === 'preferences') return mockStorage.preferences;
      if (name === 'projects') return mockStorage.projects;
      return defaultValue;
    };
    globalMemory._saveFile = (filePath, data) => {
      const name = path.basename(filePath, '.json');
      if (name === 'patterns') mockStorage.patterns = data;
      if (name === 'expertise') mockStorage.expertise = data;
      if (name === 'preferences') mockStorage.preferences = data;
      if (name === 'projects') mockStorage.projects = data;
    };
    globalMemory.init();

    sync = new TeamSync(globalMemory);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('exportForTeam', () => {
    beforeEach(() => {
      // Add test data
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.9,
        source: 'project-a',
      });
      globalMemory.recordPattern({
        type: 'async',
        pattern: 'async_await',
        confidence: 0.4, // Below default threshold
        source: 'project-b',
      });
      globalMemory.addExpertise('backend', 0.8);
      globalMemory.setPreference('verbosity', 'medium');
      globalMemory.registerProject('/test/project', { name: 'test' });
    });

    test('exports patterns above confidence threshold', () => {
      const exported = sync.exportForTeam('engineering');

      expect(exported.teamName).toBe('engineering');
      expect(exported.version).toBe(EXPORT_VERSION);
      expect(exported.patterns.length).toBe(1); // Only high confidence
      expect(exported.patterns[0].pattern).toBe('camelCase');
    });

    test('includes expertise by default', () => {
      const exported = sync.exportForTeam('engineering');

      expect(exported.expertise).toBeDefined();
      expect(exported.expertise.backend).toBeDefined();
    });

    test('includes preferences by default', () => {
      const exported = sync.exportForTeam('engineering');

      expect(exported.preferences).toBeDefined();
      expect(exported.preferences.verbosity).toBe('medium');
    });

    test('excludes projects by default', () => {
      const exported = sync.exportForTeam('engineering');

      expect(exported.projects).toBeUndefined();
    });

    test('includes projects when option set', () => {
      const exported = sync.exportForTeam('engineering', { includeProjects: true });

      expect(exported.projects).toBeDefined();
      expect(exported.projects.length).toBe(1);
    });

    test('respects minConfidence option', () => {
      const exported = sync.exportForTeam('engineering', { minConfidence: 0.3 });

      expect(exported.patterns.length).toBe(2); // Both patterns
    });

    test('includes stats', () => {
      const exported = sync.exportForTeam('engineering');

      expect(exported.stats).toBeDefined();
      expect(exported.stats.uniquePatternTypes).toBeGreaterThan(0);
    });
  });

  describe('exportConsensusPatterns', () => {
    test('exports only consensus patterns', () => {
      // Add consensus pattern (multiple sources)
      globalMemory.registerProject('/p1', { name: 'p1' });
      globalMemory.registerProject('/p2', { name: 'p2' });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.8,
        source: 'p1',
      });
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.8,
        source: 'p2',
      });

      const exported = sync.exportConsensusPatterns('engineering');

      expect(exported.type).toBe('consensus');
      expect(exported.patterns).toBeDefined();
    });
  });

  describe('importFromTeam', () => {
    test('imports patterns', () => {
      const teamData = {
        version: '1.0.0',
        teamName: 'external',
        patterns: [
          { type: 'naming', pattern: 'snake_case', confidence: 0.7 },
        ],
      };

      const result = sync.importFromTeam(teamData);

      expect(result.success).toBe(true);
      expect(result.summary.patternsImported).toBe(1);
    });

    test('handles conflicts with majority strategy', () => {
      // Add existing pattern
      globalMemory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.5,
        source: 'local',
      });

      const teamData = {
        patterns: [
          {
            type: 'naming',
            pattern: 'camelCase',
            confidence: 0.8,
            occurrences: 5,
          },
        ],
      };

      const result = sync.importFromTeam(teamData, {
        strategy: CONFLICT_STRATEGIES.MAJORITY,
      });

      expect(result.success).toBe(true);
    });

    test('imports expertise', () => {
      const teamData = {
        patterns: [],
        expertise: {
          frontend: { level: 0.9 },
        },
      };

      const result = sync.importFromTeam(teamData);

      expect(result.summary.expertiseImported).toBe(1);
    });

    test('returns error for invalid data', () => {
      const result = sync.importFromTeam(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('conflict resolution strategies', () => {
    test('HIGHEST_CONFIDENCE prefers higher confidence', () => {
      globalMemory.recordPattern({
        type: 'test',
        pattern: 'local',
        confidence: 0.3,
      });

      const teamData = {
        patterns: [{ type: 'test', pattern: 'local', confidence: 0.9 }],
      };

      sync.importFromTeam(teamData, {
        strategy: CONFLICT_STRATEGIES.HIGHEST_CONFIDENCE,
      });

      // Team pattern should win
      const pattern = globalMemory.patterns.find(
        p => p.type === 'test' && p.pattern === 'local',
      );
      expect(pattern.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('MERGE_ALL combines patterns', () => {
      globalMemory.patterns.push({
        type: 'test',
        pattern: 'merge',
        confidence: 0.5,
        sources: ['local'],
        occurrences: 2,
      });

      const teamData = {
        patterns: [{
          type: 'test',
          pattern: 'merge',
          confidence: 0.6,
          sources: ['team'],
          occurrences: 3,
        }],
      };

      sync.importFromTeam(teamData, {
        strategy: CONFLICT_STRATEGIES.MERGE_ALL,
      });

      const pattern = globalMemory.patterns.find(
        p => p.type === 'test' && p.pattern === 'merge',
      );
      expect(pattern.occurrences).toBeGreaterThan(3);
    });
  });

  describe('mergeTeamExports', () => {
    test('merges multiple team exports', () => {
      const team1 = {
        teamName: 'team1',
        patterns: [
          { type: 'naming', pattern: 'camelCase', confidence: 0.8 },
        ],
        expertise: { backend: { level: 0.7 } },
      };

      const team2 = {
        teamName: 'team2',
        patterns: [
          { type: 'naming', pattern: 'camelCase', confidence: 0.9 },
          { type: 'async', pattern: 'promises', confidence: 0.6 },
        ],
        expertise: { backend: { level: 0.9 } },
      };

      const merged = sync.mergeTeamExports([team1, team2]);

      expect(merged.sourceTeams).toContain('team1');
      expect(merged.sourceTeams).toContain('team2');
      expect(merged.patterns.length).toBe(2); // camelCase + promises
      expect(merged.stats.crossTeamPatterns).toBe(1); // camelCase in both
    });

    test('averages expertise levels', () => {
      const team1 = {
        teamName: 't1',
        patterns: [],
        expertise: { backend: { level: 0.6 } },
      };

      const team2 = {
        teamName: 't2',
        patterns: [],
        expertise: { backend: { level: 0.8 } },
      };

      const merged = sync.mergeTeamExports([team1, team2]);

      expect(merged.expertise.backend.level).toBeCloseTo(0.7, 1);
      expect(merged.expertise.backend.teamCount).toBe(2);
    });

    test('returns error for empty array', () => {
      const result = sync.mergeTeamExports([]);

      expect(result.success).toBe(false);
    });
  });

  describe('getTeamRecommendations', () => {
    test('generates recommendations by type', () => {
      const teamData = {
        teamName: 'test',
        patterns: [
          { type: 'naming', pattern: 'camelCase', confidence: 0.9 },
          { type: 'naming', pattern: 'snake_case', confidence: 0.5 },
          { type: 'async', pattern: 'async_await', confidence: 0.8 },
        ],
      };

      const recs = sync.getTeamRecommendations(teamData);

      expect(recs.recommendations.naming).toBeDefined();
      expect(recs.recommendations.naming.recommended).toBe('camelCase');
      expect(recs.recommendations.naming.alternatives).toContain('snake_case');
    });

    test('returns error for invalid data', () => {
      const recs = sync.getTeamRecommendations(null);

      expect(recs.error).toBeDefined();
    });
  });

  describe('file operations', () => {
    beforeEach(() => {
      globalMemory.recordPattern({
        type: 'test',
        pattern: 'value',
        confidence: 0.8,
      });
    });

    test('exportToFile writes data', () => {
      const filePath = path.join(testDir, 'export.json');

      const result = sync.exportToFile(filePath, 'test-team');

      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(content.teamName).toBe('test-team');
    });

    test('importFromFile reads data', () => {
      const filePath = path.join(testDir, 'import.json');
      const data = {
        version: '1.0.0',
        patterns: [{ type: 'imported', pattern: 'value', confidence: 0.7 }],
      };
      fs.writeFileSync(filePath, JSON.stringify(data));

      const result = sync.importFromFile(filePath);

      expect(result.success).toBe(true);
      expect(result.summary.patternsImported).toBe(1);
    });

    test('importFromFile returns error for missing file', () => {
      const result = sync.importFromFile('/nonexistent/file.json');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });

    test('importFromFile handles parse errors', () => {
      const filePath = path.join(testDir, 'invalid.json');
      fs.writeFileSync(filePath, 'not json');

      const result = sync.importFromFile(filePath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse');
    });
  });

  describe('validateExport', () => {
    test('validates correct export', () => {
      const data = {
        version: '1.0.0',
        patterns: [{ type: 'test', pattern: 'value' }],
      };

      const result = sync.validateExport(data);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('catches missing version', () => {
      const data = {
        patterns: [],
      };

      const result = sync.validateExport(data);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing version field');
    });

    test('catches missing patterns', () => {
      const data = {
        version: '1.0.0',
      };

      const result = sync.validateExport(data);

      expect(result.valid).toBe(false);
    });

    test('catches invalid pattern entries', () => {
      const data = {
        version: '1.0.0',
        patterns: [{ pattern: 'no type' }],
      };

      const result = sync.validateExport(data);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('missing type'))).toBe(true);
    });
  });

  describe('getStats', () => {
    test('returns local statistics', () => {
      globalMemory.recordPattern({ type: 'test', pattern: 'value' });
      globalMemory.addExpertise('backend', 0.7);

      const stats = sync.getStats();

      expect(stats.localPatterns).toBe(1);
      expect(stats.localExpertise).toBe(1);
    });
  });

  describe('constants', () => {
    test('CONFLICT_STRATEGIES has expected values', () => {
      expect(CONFLICT_STRATEGIES.MAJORITY).toBe('majority');
      expect(CONFLICT_STRATEGIES.HIGHEST_CONFIDENCE).toBe('highest_confidence');
      expect(CONFLICT_STRATEGIES.NEWEST).toBe('newest');
      expect(CONFLICT_STRATEGIES.MERGE_ALL).toBe('merge_all');
    });

    test('EXPORT_VERSION is defined', () => {
      expect(EXPORT_VERSION).toBe('1.0.0');
    });
  });
});
