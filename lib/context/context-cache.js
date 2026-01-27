/**
 * Context Cache
 *
 * LRU cache for efficiently managing loaded context.
 * Tracks usage patterns for intelligent preloading.
 */

const { tracker } = require('../metrics');

/**
 * LRU Cache implementation
 */
class LRUCache {
  /**
   * @param {number} maxSize - Maximum number of items
   * @param {number} maxAge - Maximum age in ms (0 = no expiry)
   */
  constructor(maxSize = 100, maxAge = 0) {
    this.maxSize = maxSize;
    this.maxAge = maxAge;
    this.cache = new Map();
    this.accessOrder = []; // Most recent at end
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get an item from cache
   * @param {string} key - Cache key
   * @returns {any|undefined} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiry
    if (this.maxAge > 0 && Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access order
    this.touchKey(key);
    this.hits++;

    return entry.value;
  }

  /**
   * Set an item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {object} metadata - Optional metadata
   */
  set(key, value, metadata = {}) {
    // If key exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key);
      entry.value = value;
      entry.timestamp = Date.now();
      entry.metadata = { ...entry.metadata, ...metadata };
      this.touchKey(key);
      return;
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      metadata,
    });

    this.accessOrder.push(key);
  }

  /**
   * Check if key exists (without updating access)
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    if (!this.cache.has(key)) return false;

    // Check expiry
    const entry = this.cache.get(key);
    if (this.maxAge > 0 && Date.now() - entry.timestamp > this.maxAge) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete an item from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    if (!this.cache.has(key)) return false;

    this.cache.delete(key);
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }

    return true;
  }

  /**
   * Update access order for a key
   * @param {string} key - Cache key
   */
  touchKey(key) {
    const idx = this.accessOrder.indexOf(key);
    if (idx !== -1) {
      this.accessOrder.splice(idx, 1);
    }
    this.accessOrder.push(key);

    // Update access count
    const entry = this.cache.get(key);
    if (entry) {
      entry.accessCount++;
    }
  }

  /**
   * Evict the oldest (least recently used) item
   */
  evictOldest() {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift();
    this.cache.delete(oldestKey);
  }

  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache size
   * @returns {number}
   */
  get size() {
    return this.cache.size;
  }

  /**
   * Get all keys
   * @returns {string[]}
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get most accessed items
   * @param {number} limit - Maximum results
   * @returns {Array<{key: string, accessCount: number}>}
   */
  getMostAccessed(limit = 10) {
    const items = [];
    for (const [key, entry] of this.cache) {
      items.push({ key, accessCount: entry.accessCount });
    }

    items.sort((a, b) => b.accessCount - a.accessCount);
    return items.slice(0, limit);
  }
}

/**
 * Context Cache Manager
 * Manages multiple cache layers for different context types
 */
class ContextCache {
  constructor(options = {}) {
    const {
      maxFileContent = 50,
      maxMetadata = 200,
      maxPredictions = 100,
      contentMaxAge = 5 * 60 * 1000,
      metadataMaxAge = 30 * 60 * 1000,
    } = options;

    this.fileContent = new LRUCache(maxFileContent, contentMaxAge);
    this.metadata = new LRUCache(maxMetadata, metadataMaxAge);
    this.predictions = new LRUCache(maxPredictions, 60 * 1000); // 1 min
    this.preloadQueue = [];
    this.preloadInProgress = new Set();
  }

  /**
   * Cache file content
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {object} metadata - Optional metadata
   */
  cacheFileContent(filePath, content, metadata = {}) {
    this.fileContent.set(filePath, content, {
      size: content.length,
      lineCount: content.split('\n').length,
      ...metadata,
    });
  }

  /**
   * Get cached file content
   * @param {string} filePath - File path
   * @returns {string|undefined}
   */
  getFileContent(filePath) {
    const start = Date.now();
    const result = this.fileContent.get(filePath);
    if (result !== undefined) {
      tracker.trackCacheHit('fileContent', Date.now() - start);
    } else {
      tracker.trackCacheMiss('fileContent');
    }
    return result;
  }

  /**
   * Cache metadata for a file
   * @param {string} filePath - File path
   * @param {object} meta - Metadata object
   */
  cacheMetadata(filePath, meta) {
    this.metadata.set(filePath, meta);
  }

  /**
   * Get cached metadata
   * @param {string} filePath - File path
   * @returns {object|undefined}
   */
  getMetadata(filePath) {
    const start = Date.now();
    const result = this.metadata.get(filePath);
    if (result !== undefined) {
      tracker.trackCacheHit('metadata', Date.now() - start);
    } else {
      tracker.trackCacheMiss('metadata');
    }
    return result;
  }

  /**
   * Cache a prediction result
   * @param {string} key - Prediction key (e.g., "task:authentication")
   * @param {object} prediction - Prediction result
   */
  cachePrediction(key, prediction) {
    this.predictions.set(key, prediction);
  }

  /**
   * Get cached prediction
   * @param {string} key - Prediction key
   * @returns {object|undefined}
   */
  getPrediction(key) {
    const start = Date.now();
    const result = this.predictions.get(key);
    if (result !== undefined) {
      tracker.trackCacheHit('predictions', Date.now() - start);
    } else {
      tracker.trackCacheMiss('predictions');
    }
    return result;
  }

  /**
   * Add files to preload queue
   * @param {string[]} filePaths - Files to preload
   * @param {string} priority - 'high' | 'normal' | 'low'
   */
  queuePreload(filePaths, priority = 'normal') {
    for (const filePath of filePaths) {
      if (this.fileContent.has(filePath)) continue;
      if (this.preloadInProgress.has(filePath)) continue;

      const existing = this.preloadQueue.findIndex(p => p.path === filePath);
      if (existing !== -1) {
        // Update priority if higher
        if (priority === 'high') {
          this.preloadQueue[existing].priority = 'high';
        }
      } else {
        this.preloadQueue.push({ path: filePath, priority });
      }
    }

    // Sort by priority
    this.preloadQueue.sort((a, b) => {
      const order = { high: 0, normal: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });
  }

  /**
   * Get next file to preload
   * @returns {string|null}
   */
  getNextPreload() {
    while (this.preloadQueue.length > 0) {
      const next = this.preloadQueue.shift();
      if (!this.fileContent.has(next.path) && !this.preloadInProgress.has(next.path)) {
        this.preloadInProgress.add(next.path);
        return next.path;
      }
    }
    return null;
  }

  /**
   * Mark preload as complete
   * @param {string} filePath - File path
   */
  preloadComplete(filePath) {
    this.preloadInProgress.delete(filePath);
  }

  /**
   * Invalidate cached content for a file
   * @param {string} filePath - File path
   */
  invalidate(filePath) {
    this.fileContent.delete(filePath);
    this.metadata.delete(filePath);

    // Invalidate any predictions that might include this file
    for (const key of this.predictions.keys()) {
      const prediction = this.predictions.get(key);
      if (prediction?.files?.some(f => f.path === filePath)) {
        this.predictions.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  clear() {
    this.fileContent.clear();
    this.metadata.clear();
    this.predictions.clear();
    this.preloadQueue = [];
    this.preloadInProgress.clear();
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getStats() {
    return {
      fileContent: this.fileContent.getStats(),
      metadata: this.metadata.getStats(),
      predictions: this.predictions.getStats(),
      preloadQueue: this.preloadQueue.length,
      preloadInProgress: this.preloadInProgress.size,
    };
  }

  /**
   * Get memory usage estimate
   * @returns {object}
   */
  getMemoryUsage() {
    let contentSize = 0;
    for (const key of this.fileContent.keys()) {
      const content = this.fileContent.get(key);
      if (content) {
        contentSize += content.length * 2; // Rough estimate: 2 bytes per char
      }
    }

    return {
      estimatedBytes: contentSize,
      estimatedMB: (contentSize / (1024 * 1024)).toFixed(2),
      cachedFiles: this.fileContent.size,
    };
  }

  /**
   * Warm cache with commonly accessed files
   * @param {Array<{path: string, content: string}>} files - Files to warm
   */
  warmCache(files) {
    for (const { path: filePath, content } of files) {
      this.cacheFileContent(filePath, content);
    }
  }

  /**
   * Export cache state (for persistence)
   * @returns {object}
   */
  export() {
    return {
      stats: this.getStats(),
      mostAccessed: {
        files: this.fileContent.getMostAccessed(20),
        metadata: this.metadata.getMostAccessed(20),
      },
    };
  }
}

module.exports = {
  LRUCache,
  ContextCache,
};
