'use strict';

/**
 * Metadata Cache
 *
 * Caches file metadata with automatic invalidation on file changes.
 * Uses mtime-based validation for cache freshness.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');

/**
 * MetadataCache class
 * Provides mtime-based caching for file metadata with automatic invalidation.
 */
class MetadataCache {
  constructor(options = {}) {
    this.cache = new Map(); // path -> { mtime, size, data, cachedAt }
    this.maxSize = options.maxSize || 10000;
    this.invalidationCount = 0;
    this.hitCount = 0;
    this.missCount = 0;
  }

  /**
   * Get cached metadata for a file
   * @param {string} filePath - Absolute file path
   * @returns {object|null} Cached metadata or null if invalid/missing
   */
  get(filePath) {
    const normalizedPath = this.normalizePath(filePath);
    const cached = this.cache.get(normalizedPath);

    if (!cached) {
      this.missCount++;
      return null;
    }

    // Validate cache freshness using mtime
    try {
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs !== cached.mtimeMs || stats.size !== cached.size) {
        // File changed, invalidate
        this.invalidate(normalizedPath);
        this.missCount++;
        return null;
      }

      this.hitCount++;
      return cached.data;
    } catch {
      // File doesn't exist or unreadable, invalidate
      this.invalidate(normalizedPath);
      this.missCount++;
      return null;
    }
  }

  /**
   * Set cached metadata for a file
   * @param {string} filePath - Absolute file path
   * @param {object} data - Metadata to cache
   * @returns {boolean} True if cached successfully
   */
  set(filePath, data) {
    const normalizedPath = this.normalizePath(filePath);

    try {
      const stats = fs.statSync(filePath);

      // Enforce max size with LRU eviction
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }

      this.cache.set(normalizedPath, {
        data,
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        cachedAt: Date.now(),
      });

      return true;
    } catch {
      // File doesn't exist, don't cache
      return false;
    }
  }

  /**
   * Check if a file is cached and valid
   * @param {string} filePath - File path
   * @returns {boolean}
   */
  has(filePath) {
    const normalizedPath = this.normalizePath(filePath);
    if (!this.cache.has(normalizedPath)) {
      return false;
    }

    // Validate without retrieving
    try {
      const stats = fs.statSync(filePath);
      const cached = this.cache.get(normalizedPath);
      return stats.mtimeMs === cached.mtimeMs && stats.size === cached.size;
    } catch {
      return false;
    }
  }

  /**
   * Invalidate cache for a specific file
   * @param {string} filePath - File path
   */
  invalidate(filePath) {
    const normalizedPath = this.normalizePath(filePath);
    if (this.cache.delete(normalizedPath)) {
      this.invalidationCount++;
    }
  }

  /**
   * Invalidate all files in a directory
   * @param {string} dirPath - Directory path
   */
  invalidateDirectory(dirPath) {
    const normalizedDir = this.normalizePath(dirPath);

    for (const key of this.cache.keys()) {
      if (key.startsWith(normalizedDir)) {
        this.cache.delete(key);
        this.invalidationCount++;
      }
    }
  }

  /**
   * Invalidate files matching a pattern
   * @param {RegExp} pattern - Pattern to match against file paths
   */
  invalidatePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        this.invalidationCount++;
      }
    }
  }

  /**
   * Evict oldest cache entries
   * @param {number} count - Number of entries to evict
   */
  evictOldest(count = 1) {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].cachedAt - b[1].cachedAt);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Get cache statistics
   * @returns {object}
   */
  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(1) + '%' : '0%',
      invalidations: this.invalidationCount,
    };
  }

  /**
   * Clear all cached data
   */
  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.invalidationCount = 0;
  }

  /**
   * Reset statistics without clearing cache
   */
  resetStats() {
    this.hitCount = 0;
    this.missCount = 0;
    this.invalidationCount = 0;
  }

  /**
   * Normalize file path for consistent keys
   * @param {string} filePath - File path
   * @returns {string}
   */
  normalizePath(filePath) {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Export cache for persistence
   * @returns {object}
   */
  export() {
    const entries = [];
    for (const [key, value] of this.cache) {
      entries.push({ path: key, ...value });
    }
    return {
      entries,
      stats: this.getStats(),
    };
  }

  /**
   * Import cache from persistence (validates on import)
   * @param {object} data - Previously exported data
   * @returns {number} Number of valid entries imported
   */
  import(data) {
    let imported = 0;

    if (data.entries) {
      for (const entry of data.entries) {
        // Validate entry is still fresh
        try {
          const stats = fs.statSync(entry.path);
          if (stats.mtimeMs === entry.mtimeMs && stats.size === entry.size) {
            this.cache.set(entry.path, {
              data: entry.data,
              mtimeMs: entry.mtimeMs,
              size: entry.size,
              cachedAt: entry.cachedAt,
            });
            imported++;
          }
        } catch {
          // File no longer exists, skip
        }
      }
    }

    return imported;
  }
}

// Singleton instance for global usage
const metadataCache = new MetadataCache();

module.exports = {
  MetadataCache,
  metadataCache,
};
