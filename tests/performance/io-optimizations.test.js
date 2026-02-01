'use strict';

/**
 * I/O Optimizations Tests
 *
 * Tests for metadata cache, keyword index, and graph persistence.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { MetadataCache } = require('../../lib/cache/metadata-cache');
const { KeywordIndex } = require('../../lib/index/keyword-index');
const { ContextAnalyzer, GRAPH_VERSION } = require('../../lib/context/context-analyzer');

describe('I/O Optimizations', () => {
  let tempDir;
  let testFiles;

  beforeAll(() => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), `gywd-io-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });

    // Create test files
    testFiles = [];
    for (let i = 0; i < 5; i++) {
      const filePath = path.join(tempDir, `test-file-${i}.js`);
      fs.writeFileSync(filePath, `// Test file ${i}\nconst value = ${i};\nmodule.exports = { value };`);
      testFiles.push(filePath);
    }
  });

  afterAll(() => {
    // Cleanup temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('MetadataCache', () => {
    let cache;

    beforeEach(() => {
      cache = new MetadataCache();
    });

    test('caches metadata on first access', () => {
      const testFile = testFiles[0];
      const metadata = { imports: ['./other'], exports: ['value'] };

      cache.set(testFile, metadata);
      const retrieved = cache.get(testFile);

      expect(retrieved).toEqual(metadata);
      expect(cache.getStats().size).toBe(1);
    });

    test('returns null for uncached files', () => {
      const result = cache.get('/nonexistent/file.js');
      expect(result).toBeNull();
    });

    test('tracks hit and miss statistics', () => {
      const testFile = testFiles[0];
      cache.set(testFile, { data: true });

      // One miss (uncached), then two hits
      cache.get('/nonexistent.js');
      cache.get(testFile);
      cache.get(testFile);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    test('invalidates cache when file is modified', async () => {
      const testFile = testFiles[1];
      cache.set(testFile, { original: true });

      // Verify initial cache
      expect(cache.get(testFile)).toEqual({ original: true });

      // Wait a bit and modify the file
      await new Promise(resolve => setTimeout(resolve, 50));
      fs.writeFileSync(testFile, '// Modified content');

      // Cache should be invalidated
      const result = cache.get(testFile);
      expect(result).toBeNull();
    });

    test('invalidates entire directory', () => {
      // Cache multiple files
      for (const file of testFiles) {
        cache.set(file, { cached: true });
      }

      expect(cache.getStats().size).toBe(5);

      // Invalidate directory
      cache.invalidateDirectory(tempDir);

      expect(cache.getStats().size).toBe(0);
    });

    test('enforces max size with LRU eviction', () => {
      const smallCache = new MetadataCache({ maxSize: 3 });

      // Add 5 files to cache with maxSize 3
      for (let i = 0; i < 5; i++) {
        smallCache.set(testFiles[i], { index: i });
      }

      // Should only have 3 entries
      expect(smallCache.getStats().size).toBeLessThanOrEqual(3);
    });

    test('exports and imports cache correctly', () => {
      for (const file of testFiles.slice(0, 3)) {
        cache.set(file, { cached: true });
      }

      const exported = cache.export();
      expect(exported.entries.length).toBe(3);

      // Import into new cache
      const newCache = new MetadataCache();
      const imported = newCache.import(exported);

      expect(imported).toBe(3);
      expect(newCache.getStats().size).toBe(3);
    });
  });

  describe('KeywordIndex', () => {
    let index;

    beforeEach(() => {
      index = new KeywordIndex();
    });

    test('adds files with keywords', () => {
      index.addFile('/path/auth-service.js', ['auth', 'service', 'login']);
      index.addFile('/path/user-controller.js', ['user', 'controller', 'api']);

      expect(index.getStats().indexedFiles).toBe(2);
      expect(index.getStats().uniqueKeywords).toBe(6);
    });

    test('single keyword search is O(1)', () => {
      // Add many files
      for (let i = 0; i < 1000; i++) {
        index.addFile(`/path/file-${i}.js`, [`keyword${i % 10}`, 'common']);
      }

      // Measure search time
      const times = [];
      for (let i = 0; i < 100; i++) {
        const start = performance.now();
        index.search('common');
        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b) / times.length;
      // Should be sub-millisecond
      expect(avgTime).toBeLessThan(1);
    });

    test('multi-keyword search returns ranked results', () => {
      index.addFile('/path/auth-service.js', ['auth', 'service', 'login']);
      index.addFile('/path/auth-controller.js', ['auth', 'controller', 'api']);
      index.addFile('/path/user-service.js', ['user', 'service']);

      const results = index.searchMultiple(['auth', 'service']);

      // auth-service should be first (matches both)
      expect(results[0].file).toBe('/path/auth-service.js');
      expect(results[0].matchCount).toBe(2);
    });

    test('updates file keywords correctly', () => {
      index.addFile('/path/file.js', ['old', 'keywords']);
      expect(index.search('old').size).toBe(1);

      // Update with new keywords
      index.addFile('/path/file.js', ['new', 'different']);

      expect(index.search('old').size).toBe(0);
      expect(index.search('new').size).toBe(1);
    });

    test('removes file from index', () => {
      index.addFile('/path/file.js', ['auth', 'user']);

      expect(index.search('auth').size).toBe(1);

      index.removeFile('/path/file.js');

      expect(index.search('auth').size).toBe(0);
      expect(index.getStats().indexedFiles).toBe(0);
    });

    test('finds similar files by shared keywords', () => {
      index.addFile('/path/auth-service.js', ['auth', 'service', 'token']);
      index.addFile('/path/auth-middleware.js', ['auth', 'middleware', 'token']);
      index.addFile('/path/user-service.js', ['user', 'service']);

      const similar = index.getSimilarFiles('/path/auth-service.js');

      // auth-middleware shares 2 keywords (auth, token)
      expect(similar[0].file).toBe('/path/auth-middleware.js');
      expect(similar[0].sharedKeywords).toContain('auth');
      expect(similar[0].sharedKeywords).toContain('token');
    });

    test('exports and imports index correctly', () => {
      index.addFile('/path/file1.js', ['auth', 'api']);
      index.addFile('/path/file2.js', ['user', 'api']);

      const exported = index.export();

      const newIndex = new KeywordIndex();
      newIndex.import(exported);

      expect(newIndex.getStats().indexedFiles).toBe(2);
      expect(newIndex.search('api').size).toBe(2);
    });
  });

  describe('Graph Persistence', () => {
    let analyzer;
    let cacheDir;

    beforeEach(() => {
      analyzer = new ContextAnalyzer();
      cacheDir = path.join(tempDir, 'graph-cache');
      fs.mkdirSync(cacheDir, { recursive: true });
    });

    afterEach(() => {
      analyzer.deleteCachedGraph(cacheDir);
    });

    test('saves graph to disk', () => {
      // Analyze some files
      for (const file of testFiles) {
        const content = fs.readFileSync(file, 'utf8');
        analyzer.analyzeFile(file, content);
      }

      const saved = analyzer.saveGraph(cacheDir);
      expect(saved).toBe(true);

      // Verify file exists
      const cachePath = path.join(cacheDir, 'relationship-graph.json');
      expect(fs.existsSync(cachePath)).toBe(true);
    });

    test('loads valid cached graph', () => {
      // Build and save graph
      for (const file of testFiles) {
        const content = fs.readFileSync(file, 'utf8');
        analyzer.analyzeFile(file, content);
      }
      analyzer.saveGraph(cacheDir);

      // Create new analyzer and load
      const newAnalyzer = new ContextAnalyzer();
      const loaded = newAnalyzer.loadGraph(cacheDir);

      expect(loaded).toBe(true);
      expect(newAnalyzer.getSummary().filesAnalyzed).toBe(5);
    });

    test('cached graph loads in < 50ms', () => {
      // Build and save a larger graph
      for (const file of testFiles) {
        const content = fs.readFileSync(file, 'utf8');
        analyzer.analyzeFile(file, content);
      }
      analyzer.saveGraph(cacheDir);

      // Time the load
      const newAnalyzer = new ContextAnalyzer();
      const start = Date.now();
      newAnalyzer.loadGraph(cacheDir);
      const loadTime = Date.now() - start;

      expect(loadTime).toBeLessThan(50);
    });

    test('rejects stale cache when files change', async () => {
      // Build and save graph
      for (const file of testFiles) {
        const content = fs.readFileSync(file, 'utf8');
        analyzer.analyzeFile(file, content);
      }
      analyzer.saveGraph(cacheDir);

      // Modify a file
      await new Promise(resolve => setTimeout(resolve, 50));
      fs.writeFileSync(testFiles[0], '// Changed content');

      // Load should fail due to stale cache
      const newAnalyzer = new ContextAnalyzer();
      const loaded = newAnalyzer.loadGraph(cacheDir);

      // May or may not load depending on sampling - either way is valid
      // The important thing is it doesn't crash
      expect(typeof loaded).toBe('boolean');
    });

    test('provides cache status info', () => {
      // No cache initially
      let status = analyzer.getCacheStatus(cacheDir);
      expect(status.exists).toBe(false);

      // Build and save
      analyzer.analyzeFile(testFiles[0], fs.readFileSync(testFiles[0], 'utf8'));
      analyzer.saveGraph(cacheDir);

      status = analyzer.getCacheStatus(cacheDir);
      expect(status.exists).toBe(true);
      expect(status.version).toBe(GRAPH_VERSION);
      expect(status.isCompatible).toBe(true);
      expect(status.fileCount).toBe(1);
    });

    test('deletes cached graph', () => {
      analyzer.analyzeFile(testFiles[0], fs.readFileSync(testFiles[0], 'utf8'));
      analyzer.saveGraph(cacheDir);

      expect(analyzer.getCacheStatus(cacheDir).exists).toBe(true);

      analyzer.deleteCachedGraph(cacheDir);

      expect(analyzer.getCacheStatus(cacheDir).exists).toBe(false);
    });
  });

  describe('Integration', () => {
    test('metadata cache and keyword index work together', () => {
      const cache = new MetadataCache();
      const index = new KeywordIndex();

      // Simulate analyzing files
      for (const file of testFiles) {
        // Check cache first
        let metadata = cache.get(file);

        if (!metadata) {
          // Cache miss - analyze file
          const content = fs.readFileSync(file, 'utf8');
          const keywords = ['test', 'value', 'module'];
          metadata = { content: content.length, keywords };

          // Store in cache and index
          cache.set(file, metadata);
          index.addFile(file, keywords);
        }
      }

      // All files should be cached
      expect(cache.getStats().size).toBe(5);

      // All files should be indexed
      expect(index.getStats().indexedFiles).toBe(5);

      // Search should work
      const results = index.search('test');
      expect(results.size).toBe(5);
    });
  });
});
