'use strict';

/**
 * Sync Manager Tests
 */

const { SyncManager, SYNC_STATE } = require('../../../lib/plugins/claude-mem-integration/sync-manager');

describe('SyncManager', () => {
  let syncManager;
  let mockGlobalMemory;

  beforeEach(() => {
    // Mock GlobalMemory
    mockGlobalMemory = {
      patterns: [],
      recordPattern: jest.fn((pattern) => {
        mockGlobalMemory.patterns.push(pattern);
      }),
      getPatternsByType: jest.fn((type) => {
        return mockGlobalMemory.patterns.filter(p => p.type === type);
      }),
      save: jest.fn()
    };

    syncManager = new SyncManager({
      globalMemory: mockGlobalMemory,
      batchSize: 5,
      syncInterval: 100,
      maxQueueSize: 10
    });
  });

  afterEach(() => {
    if (syncManager) {
      syncManager.stop();
    }
  });

  describe('constructor', () => {
    it('should use default options when not provided', () => {
      const defaultManager = new SyncManager();
      expect(defaultManager.batchSize).toBe(100);
      expect(defaultManager.syncInterval).toBe(30000);
      expect(defaultManager.maxQueueSize).toBe(10000);
      defaultManager.stop();
    });

    it('should use custom options when provided', () => {
      expect(syncManager.batchSize).toBe(5);
      expect(syncManager.syncInterval).toBe(100);
      expect(syncManager.maxQueueSize).toBe(10);
    });

    it('should initialize in stopped state', () => {
      expect(syncManager.state).toBe(SYNC_STATE.STOPPED);
    });

    it('should initialize empty queue', () => {
      expect(syncManager._queue).toEqual([]);
    });

    it('should initialize stats', () => {
      expect(syncManager.stats).toEqual({
        queued: 0,
        synced: 0,
        dropped: 0,
        errors: 0,
        batches: 0,
        lastSync: null,
        lastError: null
      });
    });
  });

  describe('start', () => {
    it('should set state to running', () => {
      syncManager.start();
      expect(syncManager.state).toBe(SYNC_STATE.RUNNING);
    });

    it('should not restart if already running', () => {
      syncManager.start();
      const timer1 = syncManager.syncTimer;
      syncManager.start();
      expect(syncManager.syncTimer).toBe(timer1);
    });
  });

  describe('stop', () => {
    it('should set state to stopped', () => {
      syncManager.start();
      syncManager.stop();
      expect(syncManager.state).toBe(SYNC_STATE.STOPPED);
    });

    it('should clear sync timer', () => {
      syncManager.start();
      expect(syncManager.syncTimer).not.toBeNull();
      syncManager.stop();
      expect(syncManager.syncTimer).toBeNull();
    });
  });

  describe('queue (method)', () => {
    beforeEach(() => {
      syncManager.start();
    });

    it('should add pattern to queue', () => {
      const pattern = { type: 'tool:read', pattern: 'Read' };
      const result = syncManager.queue(pattern);

      expect(result).toBe(true);
      expect(syncManager._queue.length).toBe(1);
    });

    it('should return false for null pattern', () => {
      const result = syncManager.queue(null);
      expect(result).toBe(false);
    });

    it('should increment queued stat', () => {
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      expect(syncManager.stats.queued).toBe(1);
    });

    it('should drop oldest when max queue size reached', () => {
      // Create a new sync manager with large batchSize to prevent auto-sync during test
      const testManager = new SyncManager({
        globalMemory: mockGlobalMemory,
        batchSize: 100, // Large enough to not trigger auto-sync
        syncInterval: 100,
        maxQueueSize: 10
      });
      testManager.start();

      // Fill queue to max
      for (let i = 0; i < 10; i++) {
        testManager.queue({ type: 'tool:read', pattern: `Read${i}` });
      }
      expect(testManager._queue.length).toBe(10);

      // Add one more
      testManager.queue({ type: 'tool:read', pattern: 'Read10' });

      expect(testManager._queue.length).toBe(10);
      expect(testManager.stats.dropped).toBe(1);
      testManager.stop();
    });

    it('should trigger sync when batch size reached', async () => {
      // Queue patterns up to batch size
      for (let i = 0; i < 5; i++) {
        syncManager.queue({ type: 'tool:read', pattern: `Read${i}` });
      }

      // Wait for sync to complete
      await new Promise(resolve => setTimeout(resolve, 50));

      // Queue should be empty after sync
      expect(syncManager._queue.length).toBe(0);
    });

    it('should add timestamp to queued items', () => {
      const before = Date.now();
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      const after = Date.now();

      const item = syncManager._queue[0];
      expect(item.queuedAt).toBeGreaterThanOrEqual(before);
      expect(item.queuedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('queueBatch', () => {
    beforeEach(() => {
      syncManager.start();
    });

    it('should queue multiple patterns', () => {
      const patterns = [
        { type: 'tool:read', pattern: 'Read' },
        { type: 'tool:write', pattern: 'Write' }
      ];

      const count = syncManager.queueBatch(patterns);

      expect(count).toBe(2);
      expect(syncManager._queue.length).toBe(2);
    });

    it('should return 0 for non-array input', () => {
      expect(syncManager.queueBatch(null)).toBe(0);
      expect(syncManager.queueBatch('string')).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(syncManager.queueBatch([])).toBe(0);
    });
  });

  describe('flush', () => {
    beforeEach(() => {
      syncManager.start();
    });

    it('should sync all queued patterns', async () => {
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      syncManager.queue({ type: 'tool:write', pattern: 'Write' });

      const result = await syncManager.flush();

      expect(result.synced).toBe(2);
      expect(syncManager._queue.length).toBe(0);
    });

    it('should return zeros for empty queue', async () => {
      const result = await syncManager.flush();

      expect(result.synced).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should save to globalMemory', async () => {
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      await syncManager.flush();

      expect(mockGlobalMemory.save).toHaveBeenCalled();
    });
  });

  describe('_syncBatch', () => {
    beforeEach(() => {
      syncManager.start();
    });

    it('should sync up to batchSize patterns', async () => {
      // Create a new sync manager with large batchSize to prevent auto-sync during queuing
      const testManager = new SyncManager({
        globalMemory: mockGlobalMemory,
        batchSize: 5,
        syncInterval: 100000, // Long interval to prevent scheduled sync
        maxQueueSize: 100
      });
      // Note: don't start() to avoid auto-sync on batch size

      // Manually add to queue to bypass auto-sync trigger
      for (let i = 0; i < 8; i++) {
        testManager._queue.push({
          pattern: { type: 'tool:read', pattern: `Read${i}` },
          queuedAt: Date.now()
        });
      }
      testManager.state = SYNC_STATE.RUNNING;

      // Manually trigger sync (not flush which syncs all)
      await testManager._syncBatch(false);

      expect(testManager._queue.length).toBe(3); // 8 - 5 (batchSize)
      testManager.stop();
    });

    it('should skip if already syncing', async () => {
      syncManager.state = SYNC_STATE.SYNCING;
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });

      const result = await syncManager._syncBatch();

      expect(result.skipped).toBe(true);
    });

    it('should update stats after sync', async () => {
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      await syncManager._syncBatch();

      expect(syncManager.stats.synced).toBe(1);
      expect(syncManager.stats.batches).toBe(1);
      expect(syncManager.stats.lastSync).not.toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockGlobalMemory.recordPattern = jest.fn(() => {
        throw new Error('Test error');
      });

      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      await syncManager._syncBatch();

      expect(syncManager.stats.errors).toBe(1);
      expect(syncManager.stats.lastError).toBe('Test error');
    });
  });

  describe('_importPattern', () => {
    beforeEach(() => {
      syncManager.start();
    });

    it('should throw if globalMemory not initialized', () => {
      syncManager.globalMemory = null;

      expect(() => {
        syncManager._importPattern({ type: 'tool:read', pattern: 'Read' });
      }).toThrow('GlobalMemory not initialized');
    });

    it('should record new pattern', () => {
      syncManager._importPattern({ type: 'tool:read', pattern: 'Read', confidence: 0.6 });

      expect(mockGlobalMemory.recordPattern).toHaveBeenCalledWith({
        type: 'tool:read',
        pattern: 'Read',
        confidence: 0.6,
        source: 'claude-mem'
      });
    });

    it('should use source from pattern if available', () => {
      syncManager._importPattern({
        type: 'tool:read',
        pattern: 'Read',
        confidence: 0.6,
        sources: ['my-project']
      });

      expect(mockGlobalMemory.recordPattern).toHaveBeenCalledWith({
        type: 'tool:read',
        pattern: 'Read',
        confidence: 0.6,
        source: 'my-project'
      });
    });
  });

  describe('_mergePattern', () => {
    it('should increment occurrences', () => {
      const existing = { occurrences: 5 };
      const newPattern = { occurrences: 3 };

      syncManager._mergePattern(existing, newPattern);

      expect(existing.occurrences).toBe(8);
    });

    it('should default occurrences to 1', () => {
      const existing = {};
      const newPattern = {};

      syncManager._mergePattern(existing, newPattern);

      expect(existing.occurrences).toBe(2);
    });

    it('should merge sources', () => {
      const existing = { sources: ['proj1'] };
      const newPattern = { sources: ['proj2'] };

      syncManager._mergePattern(existing, newPattern);

      expect(existing.sources).toContain('proj1');
      expect(existing.sources).toContain('proj2');
    });

    it('should deduplicate sources', () => {
      const existing = { sources: ['proj1'] };
      const newPattern = { sources: ['proj1'] };

      syncManager._mergePattern(existing, newPattern);

      expect(existing.sources.filter(s => s === 'proj1').length).toBe(1);
    });

    it('should boost confidence', () => {
      const existing = { confidence: 0.6 };
      const newPattern = {};

      syncManager._mergePattern(existing, newPattern);

      expect(existing.confidence).toBe(0.62);
    });

    it('should cap confidence at 0.95', () => {
      const existing = { confidence: 0.94 };
      const newPattern = {};

      syncManager._mergePattern(existing, newPattern);

      expect(existing.confidence).toBe(0.95);
    });

    it('should update lastSeen if newer', () => {
      const existing = { lastSeen: '2024-01-01' };
      const newPattern = { lastSeen: '2024-01-15' };

      syncManager._mergePattern(existing, newPattern);

      expect(existing.lastSeen).toBe('2024-01-15');
    });

    it('should not update lastSeen if older', () => {
      const existing = { lastSeen: '2024-01-15' };
      const newPattern = { lastSeen: '2024-01-01' };

      syncManager._mergePattern(existing, newPattern);

      expect(existing.lastSeen).toBe('2024-01-15');
    });
  });

  describe('getStats', () => {
    it('should return stats with queue length', () => {
      syncManager.start();
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });

      const stats = syncManager.getStats();

      expect(stats.queueLength).toBe(1);
      expect(stats.state).toBe(SYNC_STATE.RUNNING);
    });
  });

  describe('getQueueLength', () => {
    it('should return queue length', () => {
      syncManager.start();
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      syncManager.queue({ type: 'tool:write', pattern: 'Write' });

      expect(syncManager.getQueueLength()).toBe(2);
    });
  });

  describe('getState', () => {
    it('should return current state', () => {
      expect(syncManager.getState()).toBe(SYNC_STATE.STOPPED);
      syncManager.start();
      expect(syncManager.getState()).toBe(SYNC_STATE.RUNNING);
    });
  });

  describe('resetStats', () => {
    it('should reset all stats', () => {
      syncManager.stats.queued = 10;
      syncManager.stats.synced = 5;
      syncManager.stats.errors = 1;

      syncManager.resetStats();

      expect(syncManager.stats).toEqual({
        queued: 0,
        synced: 0,
        dropped: 0,
        errors: 0,
        batches: 0,
        lastSync: null,
        lastError: null
      });
    });
  });

  describe('clearQueue', () => {
    it('should clear queue and return count', () => {
      syncManager.start();
      syncManager.queue({ type: 'tool:read', pattern: 'Read' });
      syncManager.queue({ type: 'tool:write', pattern: 'Write' });

      const count = syncManager.clearQueue();

      expect(count).toBe(2);
      expect(syncManager._queue.length).toBe(0);
    });
  });

  describe('SYNC_STATE', () => {
    it('should have all expected states', () => {
      expect(SYNC_STATE.STOPPED).toBe('stopped');
      expect(SYNC_STATE.RUNNING).toBe('running');
      expect(SYNC_STATE.SYNCING).toBe('syncing');
      expect(SYNC_STATE.ERROR).toBe('error');
    });
  });
});
