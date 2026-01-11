/**
 * Context Cache Tests
 */

const {
  LRUCache,
  ContextCache,
} = require('../../lib/context');

describe('LRUCache', () => {
  describe('constructor', () => {
    test('initializes with default values', () => {
      const cache = new LRUCache();

      expect(cache.maxSize).toBe(100);
      expect(cache.maxAge).toBe(0);
      expect(cache.size).toBe(0);
    });

    test('accepts custom maxSize and maxAge', () => {
      const cache = new LRUCache(50, 5000);

      expect(cache.maxSize).toBe(50);
      expect(cache.maxAge).toBe(5000);
    });
  });

  describe('set and get', () => {
    test('stores and retrieves values', () => {
      const cache = new LRUCache();

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('returns undefined for missing keys', () => {
      const cache = new LRUCache();

      expect(cache.get('nonexistent')).toBeUndefined();
    });

    test('updates existing keys', () => {
      const cache = new LRUCache();

      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');
      expect(cache.size).toBe(1);
    });

    test('stores metadata with values', () => {
      const cache = new LRUCache();

      cache.set('key1', 'value1', { type: 'test' });
      // Metadata is stored but not directly accessible through get
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('LRU eviction', () => {
    test('evicts oldest when at capacity', () => {
      const cache = new LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    test('accessing item moves it to end', () => {
      const cache = new LRUCache(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.get('a'); // Access 'a', moving it to most recent
      cache.set('d', 4); // Should evict 'b' (now oldest)

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    test('expires items after maxAge', async () => {
      const cache = new LRUCache(100, 50); // 50ms TTL

      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.get('key1')).toBeUndefined();
    });

    test('has() checks expiration', async () => {
      const cache = new LRUCache(100, 50);

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 60));

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('has', () => {
    test('returns true for existing keys', () => {
      const cache = new LRUCache();

      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    test('returns false for missing keys', () => {
      const cache = new LRUCache();

      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    test('removes items', () => {
      const cache = new LRUCache();

      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    test('returns false for nonexistent keys', () => {
      const cache = new LRUCache();

      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('clear', () => {
    test('removes all items', () => {
      const cache = new LRUCache();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });

    test('resets hit/miss counters', () => {
      const cache = new LRUCache();

      cache.set('a', 1);
      cache.get('a');
      cache.get('nonexistent');
      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('keys', () => {
    test('returns all keys', () => {
      const cache = new LRUCache();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const keys = cache.keys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });
  });

  describe('getStats', () => {
    test('tracks hits and misses', () => {
      const cache = new LRUCache();

      cache.set('a', 1);
      cache.get('a'); // hit
      cache.get('a'); // hit
      cache.get('b'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    test('returns size info', () => {
      const cache = new LRUCache(100);

      cache.set('a', 1);
      cache.set('b', 2);

      const stats = cache.getStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('getMostAccessed', () => {
    test('returns items sorted by access count', () => {
      const cache = new LRUCache();

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a');
      cache.get('a');
      cache.get('a');
      cache.get('b');
      cache.get('b');

      const most = cache.getMostAccessed(2);

      expect(most.length).toBe(2);
      expect(most[0].key).toBe('a');
      expect(most[0].accessCount).toBe(4); // 1 initial + 3 gets
    });
  });
});

describe('ContextCache', () => {
  describe('constructor', () => {
    test('initializes with default options', () => {
      const cache = new ContextCache();

      expect(cache.fileContent).toBeInstanceOf(LRUCache);
      expect(cache.metadata).toBeInstanceOf(LRUCache);
      expect(cache.predictions).toBeInstanceOf(LRUCache);
    });

    test('accepts custom options', () => {
      const cache = new ContextCache({
        maxFileContent: 25,
        maxMetadata: 100,
      });

      expect(cache.fileContent.maxSize).toBe(25);
      expect(cache.metadata.maxSize).toBe(100);
    });
  });

  describe('file content caching', () => {
    test('caches and retrieves file content', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/src/file.js', 'const x = 1;');
      expect(cache.getFileContent('/src/file.js')).toBe('const x = 1;');
    });

    test('returns undefined for uncached files', () => {
      const cache = new ContextCache();

      expect(cache.getFileContent('/nonexistent.js')).toBeUndefined();
    });
  });

  describe('metadata caching', () => {
    test('caches and retrieves metadata', () => {
      const cache = new ContextCache();

      cache.cacheMetadata('/src/file.js', { size: 100, lines: 10 });
      expect(cache.getMetadata('/src/file.js')).toEqual({ size: 100, lines: 10 });
    });
  });

  describe('prediction caching', () => {
    test('caches and retrieves predictions', () => {
      const cache = new ContextCache();

      const prediction = { files: ['/a.js', '/b.js'], confidence: 0.8 };
      cache.cachePrediction('task:auth', prediction);

      expect(cache.getPrediction('task:auth')).toEqual(prediction);
    });
  });

  describe('preload queue', () => {
    test('queues files for preloading', () => {
      const cache = new ContextCache();

      cache.queuePreload(['/a.js', '/b.js']);

      expect(cache.getNextPreload()).toBe('/a.js');
      expect(cache.getNextPreload()).toBe('/b.js');
      expect(cache.getNextPreload()).toBeNull();
    });

    test('prioritizes high priority items', () => {
      const cache = new ContextCache();

      cache.queuePreload(['/low.js'], 'low');
      cache.queuePreload(['/high.js'], 'high');

      expect(cache.getNextPreload()).toBe('/high.js');
      expect(cache.getNextPreload()).toBe('/low.js');
    });

    test('skips already cached files', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/cached.js', 'content');
      cache.queuePreload(['/cached.js', '/new.js']);

      expect(cache.getNextPreload()).toBe('/new.js');
      expect(cache.getNextPreload()).toBeNull();
    });

    test('skips files in progress', () => {
      const cache = new ContextCache();

      cache.queuePreload(['/a.js', '/b.js']);
      cache.getNextPreload(); // Gets /a.js and marks in progress

      // Queue again - should not duplicate
      cache.queuePreload(['/a.js', '/c.js']);

      expect(cache.getNextPreload()).toBe('/b.js');
      expect(cache.getNextPreload()).toBe('/c.js');
    });

    test('preloadComplete removes from in-progress', () => {
      const cache = new ContextCache();

      cache.queuePreload(['/a.js']);
      cache.getNextPreload();

      expect(cache.preloadInProgress.has('/a.js')).toBe(true);

      cache.preloadComplete('/a.js');
      expect(cache.preloadInProgress.has('/a.js')).toBe(false);
    });
  });

  describe('invalidate', () => {
    test('removes file content and metadata', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/file.js', 'content');
      cache.cacheMetadata('/file.js', { size: 7 });
      cache.invalidate('/file.js');

      expect(cache.getFileContent('/file.js')).toBeUndefined();
      expect(cache.getMetadata('/file.js')).toBeUndefined();
    });

    test('invalidates predictions containing the file', () => {
      const cache = new ContextCache();

      cache.cachePrediction('task:auth', {
        files: [{ path: '/auth.js' }, { path: '/user.js' }],
      });
      cache.cachePrediction('task:other', {
        files: [{ path: '/other.js' }],
      });

      cache.invalidate('/auth.js');

      expect(cache.getPrediction('task:auth')).toBeUndefined();
      expect(cache.getPrediction('task:other')).toBeDefined();
    });
  });

  describe('clear', () => {
    test('clears all caches and queues', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/file.js', 'content');
      cache.cacheMetadata('/file.js', { size: 7 });
      cache.cachePrediction('key', { files: [] });
      cache.queuePreload(['/new.js']);

      cache.clear();

      expect(cache.fileContent.size).toBe(0);
      expect(cache.metadata.size).toBe(0);
      expect(cache.predictions.size).toBe(0);
      expect(cache.preloadQueue.length).toBe(0);
    });
  });

  describe('getStats', () => {
    test('returns statistics for all caches', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/file.js', 'content');
      cache.queuePreload(['/new.js']);
      cache.getNextPreload();

      const stats = cache.getStats();

      expect(stats.fileContent).toBeDefined();
      expect(stats.metadata).toBeDefined();
      expect(stats.predictions).toBeDefined();
      expect(stats.preloadQueue).toBe(0);
      expect(stats.preloadInProgress).toBe(1);
    });
  });

  describe('getMemoryUsage', () => {
    test('estimates memory usage', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/a.js', 'a'.repeat(1000));
      cache.cacheFileContent('/b.js', 'b'.repeat(500));

      const usage = cache.getMemoryUsage();

      expect(usage.cachedFiles).toBe(2);
      expect(usage.estimatedBytes).toBe(3000); // 1500 chars × 2 bytes
      expect(parseFloat(usage.estimatedMB)).toBeLessThan(0.01);
    });
  });

  describe('warmCache', () => {
    test('pre-populates cache with files', () => {
      const cache = new ContextCache();

      cache.warmCache([
        { path: '/a.js', content: 'content a' },
        { path: '/b.js', content: 'content b' },
      ]);

      expect(cache.getFileContent('/a.js')).toBe('content a');
      expect(cache.getFileContent('/b.js')).toBe('content b');
    });
  });

  describe('export', () => {
    test('exports cache state', () => {
      const cache = new ContextCache();

      cache.cacheFileContent('/file.js', 'content');
      cache.getFileContent('/file.js'); // Create access stats

      const exported = cache.export();

      expect(exported.stats).toBeDefined();
      expect(exported.mostAccessed).toBeDefined();
      expect(exported.mostAccessed.files).toBeDefined();
    });
  });
});
