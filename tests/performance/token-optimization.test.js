'use strict';

/**
 * Token Optimization Tests
 *
 * Tests for context/token reduction features:
 * - Profile compaction
 * - Metrics dashboard rendering
 * - Size reduction validation
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { ProfileManager } = require('../../lib/profile/profile-manager');
const { MetricsDashboard } = require('../../lib/metrics/dashboard');
const { PerformanceTracker } = require('../../lib/metrics/performance-tracker');

describe('Token Optimization', () => {
  let tempDir;
  let profileManager;

  beforeAll(() => {
    // Create temp directory for profile tests
    tempDir = path.join(os.tmpdir(), `gywd-token-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  beforeEach(() => {
    profileManager = new ProfileManager(tempDir);
    profileManager.init();
  });

  describe('Compact Profile', () => {
    test('returns compact profile with essential data', () => {
      const compact = profileManager.getCompactProfile();

      expect(compact).toHaveProperty('version');
      expect(compact).toHaveProperty('cognitive');
      expect(compact).toHaveProperty('communication');
      expect(compact).toHaveProperty('topExpertise');
      expect(compact).toHaveProperty('languages');
      expect(compact).toHaveProperty('stats');
    });

    test('compact profile is smaller than full profile', () => {
      const sizes = profileManager.getProfileSize();

      expect(sizes.compact).toBeLessThan(sizes.full);
      expect(sizes.reduction).toBeGreaterThan(0);
    });

    test('compact profile preserves core cognitive info', () => {
      profileManager.updateSection('cognitive', {
        problemApproach: 'top-down',
        debuggingStyle: 'systematic',
      });

      const compact = profileManager.getCompactProfile();

      expect(compact.cognitive.approach).toBe('top-down');
      expect(compact.cognitive.style).toBe('systematic');
    });

    test('compact profile preserves communication preferences', () => {
      profileManager.updateSection('communication', {
        verbosity: 'detailed',
        formality: 'casual',
      });

      const compact = profileManager.getCompactProfile();

      expect(compact.communication.verbosity).toBe('detailed');
      expect(compact.communication.formality).toBe('casual');
    });

    test('compact profile limits expertise to top 5', () => {
      // Add 10 expertise areas
      for (let i = 0; i < 10; i++) {
        profileManager.addExpertise(`area-${i}`);
      }

      const compact = profileManager.getCompactProfile();

      expect(compact.topExpertise.length).toBeLessThanOrEqual(5);
    });

    test('compact profile includes only high-confidence preferences', () => {
      // Add low confidence preference
      profileManager.recordPreference('lowConf', 'value1', 0.3);
      // Add high confidence preference
      profileManager.recordPreference('highConf', 'value2', 0.9);

      const compact = profileManager.getCompactProfile();

      expect(compact.preferences.highConf).toBe('value2');
      expect(compact.preferences.lowConf).toBeUndefined();
    });

    test('compact profile includes recent patterns only', () => {
      // Add 10 patterns
      for (let i = 0; i < 10; i++) {
        profileManager.recordPattern({ type: `pattern-${i}` });
      }

      const compact = profileManager.getCompactProfile();

      expect(compact.recentPatterns.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Profile Size Reduction', () => {
    test('getProfileSize returns size comparison', () => {
      const sizes = profileManager.getProfileSize();

      expect(sizes).toHaveProperty('full');
      expect(sizes).toHaveProperty('compact');
      expect(sizes).toHaveProperty('reduction');
      expect(sizes).toHaveProperty('fullKB');
      expect(sizes).toHaveProperty('compactKB');
    });

    test('reduction percentage is calculated correctly', () => {
      const sizes = profileManager.getProfileSize();

      const expectedReduction = Math.round((1 - sizes.compact / sizes.full) * 100);
      expect(sizes.reduction).toBe(expectedReduction);
    });

    test('size values are in KB format', () => {
      const sizes = profileManager.getProfileSize();

      expect(parseFloat(sizes.fullKB)).toBeGreaterThan(0);
      expect(parseFloat(sizes.compactKB)).toBeGreaterThan(0);
    });
  });

  describe('Export with Limit', () => {
    test('exportWithLimit respects byte limit', () => {
      // Add lots of data
      for (let i = 0; i < 20; i++) {
        profileManager.addExpertise(`expertise-area-${i}-with-long-name`);
        profileManager.addLanguage(`language-${i}`);
      }

      const exported = profileManager.exportWithLimit(500);
      const json = JSON.stringify(exported);

      // Should be under 1KB even with limit exceeded (falls back to minimal)
      expect(json.length).toBeLessThan(1024);
    });

    test('exportWithLimit includes essential data', () => {
      profileManager.updateSection('cognitive', { problemApproach: 'bottom-up' });

      const exported = profileManager.exportWithLimit(2048);

      expect(exported.cognitive).toBeDefined();
      expect(exported.communication).toBeDefined();
    });
  });

  describe('Metrics Dashboard', () => {
    let tracker;
    let dashboard;

    beforeEach(() => {
      tracker = new PerformanceTracker();
      dashboard = new MetricsDashboard(tracker);
    });

    test('renders markdown dashboard', () => {
      const output = dashboard.render();

      expect(output).toContain('## Performance Metrics Dashboard');
      expect(output).toContain('### Cache Performance');
      expect(output).toContain('### File I/O');
      expect(output).toContain('### Memory Optimization');
      expect(output).toContain('### Commands');
    });

    test('renders tables with proper formatting', () => {
      const output = dashboard.render();

      // Check for table separators
      expect(output).toContain('|-------|');
      expect(output).toContain('| Cache |');
    });

    test('includes session uptime', () => {
      // Wait a bit to get non-zero uptime
      const output = dashboard.render();

      expect(output).toContain('**Session uptime:**');
    });

    test('tracks cache statistics', () => {
      tracker.trackCacheHit('fileContent', 5);
      tracker.trackCacheHit('fileContent', 3);
      tracker.trackCacheMiss('fileContent');

      const output = dashboard.render();

      expect(output).toContain('fileContent');
      expect(output).toContain('2'); // 2 hits
    });

    test('tracks I/O statistics', () => {
      tracker.trackFileRead('/test.js', 1024, 10);
      tracker.trackFileWrite('/test.js', 512, 5);

      const output = dashboard.render();

      expect(output).toContain('Reads');
      expect(output).toContain('Writes');
    });

    test('tracks memory optimization stats', () => {
      tracker.trackMemoryWrite(true); // batched
      tracker.trackMemoryWrite(true); // batched
      tracker.trackMemoryWrite(false); // immediate

      const output = dashboard.render();

      expect(output).toContain('Batched writes');
      expect(output).toContain('Batch efficiency');
    });

    test('renderCompact returns single line summary', () => {
      tracker.trackCacheHit('fileContent', 1);
      tracker.trackFileRead('/test.js', 100, 1);

      const compact = dashboard.renderCompact();

      expect(compact).toMatch(/^\[.+\]$/);
      expect(compact).toContain('Cache:');
      expect(compact).toContain('I/O:');
      expect(compact).toContain('Up:');
    });

    test('renderJSON returns structured data', () => {
      tracker.trackCacheHit('metadata', 1);

      const json = dashboard.renderJSON();

      expect(json).toHaveProperty('sessionUptime');
      expect(json).toHaveProperty('cache');
      expect(json).toHaveProperty('fileIO');
      expect(json).toHaveProperty('memory');
    });
  });

  describe('Dashboard Formatting', () => {
    let dashboard;

    beforeEach(() => {
      dashboard = new MetricsDashboard(new PerformanceTracker());
    });

    test('_bytes formats bytes correctly', () => {
      expect(dashboard._bytes(0)).toBe('0B');
      expect(dashboard._bytes(512)).toBe('512B');
      expect(dashboard._bytes(1024)).toBe('1.0KB');
      expect(dashboard._bytes(1536)).toBe('1.5KB');
      expect(dashboard._bytes(1048576)).toBe('1.0MB');
    });

    test('_duration formats time correctly', () => {
      expect(dashboard._duration(0)).toBe('0s');
      expect(dashboard._duration(5000)).toBe('5s');
      expect(dashboard._duration(65000)).toBe('1m 5s');
      expect(dashboard._duration(3665000)).toBe('1h 1m');
    });
  });

  describe('Integration', () => {
    test('compact profile and dashboard work together', () => {
      // Populate profile
      profileManager.updateSection('cognitive', { problemApproach: 'hybrid' });
      profileManager.addLanguage('JavaScript');
      profileManager.recordPattern({ type: 'async-await' });

      // Get compact profile
      const compact = profileManager.getCompactProfile();
      const sizes = profileManager.getProfileSize();

      // Create tracker and dashboard
      const tracker = new PerformanceTracker();
      tracker.trackCacheHit('fileContent', 1);
      const dashboard = new MetricsDashboard(tracker);

      // Both should work
      expect(compact).toBeDefined();
      expect(sizes.reduction).toBeGreaterThan(0);
      expect(dashboard.render()).toContain('Performance Metrics');
    });
  });
});
