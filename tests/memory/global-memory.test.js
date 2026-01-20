'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { GlobalMemory } = require('../../lib/memory');

describe('GlobalMemory', () => {
  let memory;
  let testDir;

  beforeEach(() => {
    // Use a temp directory for testing
    testDir = path.join(os.tmpdir(), `gywd-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Mock the global dir
    memory = new GlobalMemory();
    memory._ensureDirectories = () => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    };
    memory._loadFile = (filePath, defaultValue) => {
      const testPath = path.join(testDir, path.basename(filePath));
      try {
        if (fs.existsSync(testPath)) {
          return JSON.parse(fs.readFileSync(testPath, 'utf8'));
        }
      } catch (err) {
        // Return default
      }
      return defaultValue;
    };
    memory._saveFile = (filePath, data) => {
      const testPath = path.join(testDir, path.basename(filePath));
      fs.writeFileSync(testPath, JSON.stringify(data, null, 2), 'utf8');
    };

    memory.init();
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    test('initializes with empty data', () => {
      expect(memory.patterns).toEqual([]);
      expect(memory.expertise).toEqual({});
      expect(memory.preferences).toEqual({});
      expect(memory.projects).toEqual([]);
      expect(memory.initialized).toBe(true);
    });

    test('init returns this for chaining', () => {
      const newMemory = new GlobalMemory();
      newMemory._ensureDirectories = () => {};
      newMemory._loadFile = () => [];
      const result = newMemory.init();
      expect(result).toBe(newMemory);
    });
  });

  describe('patterns', () => {
    test('recordPattern adds new pattern', () => {
      memory.recordPattern({
        type: 'naming',
        pattern: 'camelCase',
        confidence: 0.8,
      });

      expect(memory.patterns.length).toBe(1);
      expect(memory.patterns[0].type).toBe('naming');
      expect(memory.patterns[0].pattern).toBe('camelCase');
      expect(memory.patterns[0].confidence).toBe(0.8);
      expect(memory.patterns[0].occurrences).toBe(1);
    });

    test('recordPattern reinforces existing pattern', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.5 });
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.5 });

      expect(memory.patterns.length).toBe(1);
      expect(memory.patterns[0].occurrences).toBe(2);
      expect(memory.patterns[0].confidence).toBe(0.6); // 0.5 + 0.1
    });

    test('recordPattern tracks sources', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', source: 'project-a' });
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', source: 'project-b' });

      expect(memory.patterns[0].sources).toContain('project-a');
      expect(memory.patterns[0].sources).toContain('project-b');
    });

    test('getPatternsByType returns filtered patterns', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase' });
      memory.recordPattern({ type: 'naming', pattern: 'snake_case' });
      memory.recordPattern({ type: 'structure', pattern: 'functional' });

      const namingPatterns = memory.getPatternsByType('naming');
      expect(namingPatterns.length).toBe(2);
      expect(namingPatterns.every(p => p.type === 'naming')).toBe(true);
    });

    test('getDominantPattern returns highest confidence', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.9 });
      memory.recordPattern({ type: 'naming', pattern: 'snake_case', confidence: 0.3 });

      const dominant = memory.getDominantPattern('naming');
      expect(dominant.pattern).toBe('camelCase');
    });

    test('getDominantPattern returns null for unknown type', () => {
      const dominant = memory.getDominantPattern('unknown');
      expect(dominant).toBeNull();
    });

    test('getConfidentPatterns filters by threshold', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.9 });
      memory.recordPattern({ type: 'naming', pattern: 'snake_case', confidence: 0.3 });
      memory.recordPattern({ type: 'structure', pattern: 'oop', confidence: 0.8 });

      const confident = memory.getConfidentPatterns(0.7);
      expect(confident.length).toBe(2);
      expect(confident.every(p => p.confidence >= 0.7)).toBe(true);
    });
  });

  describe('expertise', () => {
    test('addExpertise creates new expertise', () => {
      memory.addExpertise('backend', 0.8);

      expect(memory.expertise.backend).toBeDefined();
      expect(memory.expertise.backend.level).toBe(0.8);
      expect(memory.expertise.backend.observations).toBe(1);
    });

    test('addExpertise averages with existing', () => {
      memory.addExpertise('backend', 1.0);
      memory.addExpertise('backend', 0.5);

      // Weighted average: 1.0 * 0.7 + 0.5 * 0.3 = 0.85
      expect(memory.expertise.backend.level).toBeCloseTo(0.85, 2);
      expect(memory.expertise.backend.observations).toBe(2);
    });

    test('getExpertise returns level', () => {
      memory.addExpertise('frontend', 0.7);
      expect(memory.getExpertise('frontend')).toBe(0.7);
    });

    test('getExpertise returns 0 for unknown', () => {
      expect(memory.getExpertise('unknown')).toBe(0);
    });

    test('getAllExpertise returns copy', () => {
      memory.addExpertise('backend', 0.8);
      memory.addExpertise('frontend', 0.6);

      const all = memory.getAllExpertise();
      expect(Object.keys(all).length).toBe(2);
      expect(all.backend.level).toBe(0.8);
    });

    test('getTopExpertise returns sorted list', () => {
      memory.addExpertise('backend', 0.9);
      memory.addExpertise('frontend', 0.5);
      memory.addExpertise('devops', 0.7);

      const top = memory.getTopExpertise(2);
      expect(top.length).toBe(2);
      expect(top[0].domain).toBe('backend');
      expect(top[1].domain).toBe('devops');
    });
  });

  describe('preferences', () => {
    test('setPreference stores value', () => {
      memory.setPreference('theme', 'dark');
      expect(memory.preferences.theme.value).toBe('dark');
    });

    test('getPreference returns value', () => {
      memory.setPreference('editor', 'vim');
      expect(memory.getPreference('editor')).toBe('vim');
    });

    test('getPreference returns default for unknown', () => {
      expect(memory.getPreference('unknown', 'default')).toBe('default');
    });

    test('getAllPreferences returns flat object', () => {
      memory.setPreference('theme', 'dark');
      memory.setPreference('tabs', 2);

      const all = memory.getAllPreferences();
      expect(all.theme).toBe('dark');
      expect(all.tabs).toBe(2);
    });
  });

  describe('projects', () => {
    test('registerProject adds new project', () => {
      memory.registerProject('/path/to/project', { name: 'My Project' });

      expect(memory.projects.length).toBe(1);
      expect(memory.projects[0].path).toBe('/path/to/project');
      expect(memory.projects[0].name).toBe('My Project');
      expect(memory.projects[0].accessCount).toBe(1);
    });

    test('registerProject updates existing', () => {
      memory.registerProject('/path/to/project');
      memory.registerProject('/path/to/project', { version: '2.0' });

      expect(memory.projects.length).toBe(1);
      expect(memory.projects[0].accessCount).toBe(2);
      expect(memory.projects[0].metadata.version).toBe('2.0');
    });

    test('getProjects returns copy', () => {
      memory.registerProject('/project-a');
      memory.registerProject('/project-b');

      const projects = memory.getProjects();
      expect(projects.length).toBe(2);
    });

    test('getRecentProjects returns sorted by access', () => {
      memory.registerProject('/old-project');
      memory.projects[0].lastAccessed = '2020-01-01T00:00:00.000Z';

      memory.registerProject('/new-project');

      const recent = memory.getRecentProjects(1);
      expect(recent[0].path).toBe('/new-project');
    });
  });

  describe('sync', () => {
    test('importFromProfile imports patterns', () => {
      const profile = {
        patterns: [
          { type: 'naming', description: 'camelCase' },
          { type: 'async', description: 'async_await' },
        ],
      };

      memory.importFromProfile(profile, '/test/project');

      expect(memory.patterns.length).toBe(2);
      expect(memory.patterns[0].sources).toContain('project');
    });

    test('importFromProfile imports expertise from languages', () => {
      const profile = {
        tooling: {
          primaryLanguages: ['javascript', 'typescript'],
        },
      };

      memory.importFromProfile(profile, '/test/project');

      expect(memory.getExpertise('javascript')).toBe(0.7);
      expect(memory.getExpertise('typescript')).toBe(0.7);
    });

    test('importFromProfile registers project', () => {
      const profile = { name: 'Test Project' };
      memory.importFromProfile(profile, '/test/project');

      expect(memory.projects.length).toBe(1);
      expect(memory.projects[0].name).toBe('Test Project');
    });

    test('exportToProfile adds global patterns', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.9 });
      memory.addExpertise('backend', 0.8);
      memory.setPreference('tabs', 2);

      const enhanced = memory.exportToProfile({});

      expect(enhanced.globalPatterns.length).toBe(1);
      expect(enhanced.globalExpertise.length).toBe(1);
      expect(enhanced.globalPreferences.tabs).toBe(2);
    });
  });

  describe('utilities', () => {
    test('clear resets all data', () => {
      memory.recordPattern({ type: 'test', pattern: 'value' });
      memory.addExpertise('backend', 0.8);
      memory.setPreference('key', 'value');
      memory.registerProject('/project');

      memory.clear();

      expect(memory.patterns.length).toBe(0);
      expect(Object.keys(memory.expertise).length).toBe(0);
      expect(Object.keys(memory.preferences).length).toBe(0);
      expect(memory.projects.length).toBe(0);
    });

    test('getStats returns statistics', () => {
      memory.recordPattern({ type: 'naming', pattern: 'camelCase', confidence: 0.9 });
      memory.recordPattern({ type: 'structure', pattern: 'oop', confidence: 0.5 });
      memory.addExpertise('backend', 0.8);
      memory.setPreference('tabs', 2);
      memory.registerProject('/project');

      const stats = memory.getStats();

      expect(stats.totalPatterns).toBe(2);
      expect(stats.patternTypes).toContain('naming');
      expect(stats.patternTypes).toContain('structure');
      expect(stats.expertiseAreas).toBe(1);
      expect(stats.preferencesCount).toBe(1);
      expect(stats.projectsCount).toBe(1);
      expect(stats.highConfidencePatterns).toBe(1);
    });

    test('getGlobalDir returns path', () => {
      const dir = GlobalMemory.getGlobalDir();
      expect(dir).toContain('.gywd');
      expect(dir).toContain('global');
    });
  });

  describe('auto-initialization', () => {
    test('methods auto-init if not initialized', () => {
      const newMemory = new GlobalMemory();
      newMemory._ensureDirectories = () => {};
      newMemory._loadFile = () => [];
      newMemory._saveFile = () => {};

      // Should not throw, should auto-init
      newMemory.recordPattern({ type: 'test', pattern: 'value' });
      expect(newMemory.initialized).toBe(true);
    });
  });
});
