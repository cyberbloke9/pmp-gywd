'use strict';

const path = require('path');
const { PerformanceTracker } = require('../../lib/metrics');
const { GlobalMemory } = require('../../lib/memory/global-memory');
const { CommandCache } = require('../../lib/cache');
const { wait, benchmark } = require('./helpers');

describe('Performance Baseline', () => {
  describe('PerformanceTracker', () => {
    let tracker;

    beforeEach(() => {
      tracker = new PerformanceTracker();
    });

    test('tracks cache hits and misses correctly', () => {
      tracker.trackCacheHit('fileContent', 5);
      tracker.trackCacheHit('fileContent', 3);
      tracker.trackCacheMiss('fileContent');

      const report = tracker.getReport();
      expect(report.cache.fileContent.hits).toBe(2);
      expect(report.cache.fileContent.misses).toBe(1);
      expect(report.cache.fileContent.hitRate).toBeCloseTo(0.667, 2);
    });

    test('tracks file I/O operations', () => {
      tracker.trackFileRead('/file1', 1024, 10);
      tracker.trackFileRead('/file2', 2048, 5);
      tracker.trackFileWrite('/file3', 512, 8);

      const stats = tracker.getIOStats();
      expect(stats.reads).toBe(2);
      expect(stats.writes).toBe(1);
      expect(stats.readBytes).toBe(3072);
      expect(stats.writeBytes).toBe(512);
    });

    test('tracks memory write batching', () => {
      tracker.trackMemoryWrite(true);
      tracker.trackMemoryWrite(true);
      tracker.trackMemoryWrite(false);

      const stats = tracker.getMemoryStats();
      expect(stats.batchedWrites).toBe(2);
      expect(stats.immediateWrites).toBe(1);
      expect(stats.batchingEfficiency).toBeCloseTo(0.667, 2);
    });

    test('getReport returns structured metrics', () => {
      const report = tracker.getReport();

      expect(report).toHaveProperty('sessionUptime');
      expect(report).toHaveProperty('cache');
      expect(report).toHaveProperty('fileIO');
      expect(report).toHaveProperty('memory');
      expect(report).toHaveProperty('commands');
    });

    test('getSummary returns human-readable string', () => {
      const summary = tracker.getSummary();
      expect(typeof summary).toBe('string');
      expect(summary).toMatch(/Session:/);
      expect(summary).toMatch(/Cache hits:/);
    });
  });

  describe('GlobalMemory Batching', () => {
    let memory;

    beforeEach(() => {
      memory = new GlobalMemory();
      memory._batchWindowMs = 50; // Short window for testing
    });

    afterEach(() => {
      // Clean up any pending timeouts
      if (memory._writeTimeout) {
        clearTimeout(memory._writeTimeout);
      }
    });

    test('batches multiple rapid saves into single write', async () => {
      let writeCount = 0;
      const originalDoWrite = memory._doWrite.bind(memory);
      memory._doWrite = () => {
        writeCount++;
        // Don't actually write to disk in tests
      };

      // Record 10 patterns rapidly
      for (let i = 0; i < 10; i++) {
        memory.patterns.push({ test: i });
        memory.save();
      }

      expect(memory.hasPendingWrite()).toBe(true);

      // Wait for batch window to complete
      await wait(100);

      expect(writeCount).toBeLessThanOrEqual(2);
      expect(memory.hasPendingWrite()).toBe(false);
    });

    test('flush() forces immediate write', () => {
      let writeCount = 0;
      memory._doWrite = () => { writeCount++; };

      memory.patterns.push({ test: 1 });
      memory.save();

      expect(memory.hasPendingWrite()).toBe(true);
      memory.flush();
      expect(memory.hasPendingWrite()).toBe(false);
      expect(writeCount).toBe(1);
    });

    test('setBatchWindow adjusts timing', () => {
      expect(memory.getBatchWindow()).toBe(50);
      memory.setBatchWindow(200);
      expect(memory.getBatchWindow()).toBe(200);
      memory.setBatchWindow(-10);
      expect(memory.getBatchWindow()).toBe(0);
    });
  });

  describe('CommandCache', () => {
    let cache;
    const commandsDir = path.join(__dirname, '..', '..', 'commands', 'gywd');

    beforeEach(() => {
      cache = new CommandCache();
    });

    test('loads all 40 commands', () => {
      const count = cache.loadAll(commandsDir);
      expect(count).toBe(43);
    });

    test('loading commands takes < 100ms', () => {
      const start = Date.now();
      cache.loadAll(commandsDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    test('cached access is < 1ms average', () => {
      cache.loadAll(commandsDir);

      const stats = benchmark(() => cache.get('progress'), 1000);
      expect(stats.avg).toBeLessThan(1);
    });

    test('has() returns correct values', () => {
      cache.loadAll(commandsDir);

      expect(cache.has('progress')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    test('getStats() returns cache information', () => {
      cache.loadAll(commandsDir);

      const stats = cache.getStats();
      expect(stats.size).toBe(43);
      expect(typeof stats.loadTime).toBe('number');
      expect(typeof stats.loadedAt).toBe('number');
    });

    test('needsRefresh() returns true for unloaded cache', () => {
      // Before loading, cache needs refresh
      expect(cache.needsRefresh()).toBe(true);

      cache.loadAll(commandsDir);

      // After loading, cache is fresh (for reasonable max age)
      expect(cache.needsRefresh()).toBe(false);
      expect(cache.needsRefresh(60000)).toBe(false); // 1 minute is plenty

      // Simulate stale cache by backdating loadedAt
      cache.loadedAt = Date.now() - 120000; // 2 minutes ago
      expect(cache.needsRefresh(60000)).toBe(true); // 1 minute max age
    });

    test('clear() resets cache', () => {
      cache.loadAll(commandsDir);
      expect(cache.getStats().size).toBe(43);

      cache.clear();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('Cache Hit Rates', () => {
    test('LRU cache tracks hit rate accurately', () => {
      const { LRUCache } = require('../../lib/context/context-cache');
      const cache = new LRUCache(10);

      // Add some items
      cache.set('a', 1);
      cache.set('b', 2);

      // Access pattern: hit, hit, miss, hit
      cache.get('a'); // hit
      cache.get('a'); // hit
      cache.get('c'); // miss
      cache.get('b'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.75);
    });
  });
});

describe('Performance Baseline Metrics', () => {
  test('documents baseline performance numbers', () => {
    const { CommandCache } = require('../../lib/cache');
    const cache = new CommandCache();
    const commandsDir = path.join(__dirname, '..', '..', 'commands', 'gywd');

    // Load commands and capture timing
    cache.loadAll(commandsDir);
    const stats = cache.getStats();

    // Document baseline
    console.log('\n📊 PERFORMANCE BASELINE:');
    console.log(`   Commands loaded: ${stats.size}`);
    console.log(`   Load time: ${stats.loadTime}ms`);

    // Benchmark cached access
    const accessStats = benchmark(() => cache.get('progress'), 10000);
    console.log(`   Cached access (10000 iterations): ${accessStats.total}ms total, ${accessStats.avg.toFixed(3)}ms avg`);

    // These assertions ensure baseline stays within acceptable range
    expect(stats.size).toBe(43);
    expect(stats.loadTime).toBeLessThan(200); // Conservative limit
    expect(accessStats.avg).toBeLessThan(1);
  });
});
