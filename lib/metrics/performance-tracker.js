'use strict';

/**
 * Performance Tracker
 *
 * Tracks performance metrics for GYWD operations including:
 * - Cache hit/miss rates
 * - File I/O statistics
 * - Command loading times
 * - Memory write batching efficiency
 *
 * @example
 * const { tracker } = require('./performance-tracker');
 * tracker.trackCacheHit('fileContent', 5);
 * tracker.trackFileRead('/path/to/file', 1024, 12);
 * console.log(tracker.getReport());
 */
class PerformanceTracker {
  constructor() {
    this.reset();
  }

  /**
   * Reset all metrics to initial state
   */
  reset() {
    this.metrics = {
      cache: {
        fileContent: { hits: 0, misses: 0, totalHitTimeMs: 0 },
        metadata: { hits: 0, misses: 0, totalHitTimeMs: 0 },
        predictions: { hits: 0, misses: 0, totalHitTimeMs: 0 },
      },
      fileIO: {
        reads: 0,
        writes: 0,
        scans: 0,
        readBytes: 0,
        writeBytes: 0,
        timings: [],
      },
      commands: {
        cached: 0,
        loaded: 0,
        definitions: new Map(),
      },
      memory: {
        batchedWrites: 0,
        immediateWrites: 0,
        patternRecords: 0,
      },
    };
    this.sessionStart = Date.now();
  }

  /**
   * Track a cache hit
   * @param {string} cacheType - 'fileContent' | 'metadata' | 'predictions'
   * @param {number} durationMs - Time to retrieve from cache
   */
  trackCacheHit(cacheType, durationMs = 0) {
    if (this.metrics.cache[cacheType]) {
      this.metrics.cache[cacheType].hits++;
      this.metrics.cache[cacheType].totalHitTimeMs += durationMs;
    }
  }

  /**
   * Track a cache miss
   * @param {string} cacheType - 'fileContent' | 'metadata' | 'predictions'
   */
  trackCacheMiss(cacheType) {
    if (this.metrics.cache[cacheType]) {
      this.metrics.cache[cacheType].misses++;
    }
  }

  /**
   * Track a file read operation
   * @param {string} _filePath - Path to file (for future detailed tracking)
   * @param {number} bytes - Number of bytes read
   * @param {number} durationMs - Time taken to read
   */
  trackFileRead(_filePath, bytes, durationMs) {
    this.metrics.fileIO.reads++;
    this.metrics.fileIO.readBytes += bytes || 0;
    if (durationMs !== undefined) {
      this.metrics.fileIO.timings.push({
        type: 'read',
        bytes,
        durationMs,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Track a file write operation
   * @param {string} _filePath - Path to file (for future detailed tracking)
   * @param {number} bytes - Number of bytes written
   * @param {number} durationMs - Time taken to write
   */
  trackFileWrite(_filePath, bytes, durationMs) {
    this.metrics.fileIO.writes++;
    this.metrics.fileIO.writeBytes += bytes || 0;
    if (durationMs !== undefined) {
      this.metrics.fileIO.timings.push({
        type: 'write',
        bytes,
        durationMs,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Track a directory scan operation
   */
  trackScan() {
    this.metrics.fileIO.scans++;
  }

  /**
   * Track a command definition load
   * @param {string} commandName - Name of the command
   * @param {boolean} cached - Whether it was loaded from cache
   */
  trackCommandLoad(commandName, cached) {
    if (cached) {
      this.metrics.commands.cached++;
    } else {
      this.metrics.commands.loaded++;
      this.metrics.commands.definitions.set(commandName, Date.now());
    }
  }

  /**
   * Track a memory write operation
   * @param {boolean} batched - Whether the write was batched
   */
  trackMemoryWrite(batched) {
    if (batched) {
      this.metrics.memory.batchedWrites++;
    } else {
      this.metrics.memory.immediateWrites++;
    }
  }

  /**
   * Track a pattern record operation
   */
  trackPatternRecord() {
    this.metrics.memory.patternRecords++;
  }

  /**
   * Track prediction generation
   * @param {object} stats - Prediction statistics
   * @param {number} stats.total - Total predictions generated
   * @param {number} stats.returned - Predictions returned (after truncation)
   * @param {number} stats.truncated - Number of predictions truncated
   */
  trackPrediction(stats) {
    // Future expansion for prediction tracking
    this._lastPrediction = stats;
  }

  /**
   * Get hit rate for a cache type
   * @param {string} cacheType - Cache type to check
   * @returns {number} Hit rate between 0 and 1
   */
  getHitRate(cacheType) {
    const cache = this.metrics.cache[cacheType];
    if (!cache) return 0;
    const total = cache.hits + cache.misses;
    return total > 0 ? cache.hits / total : 0;
  }

  /**
   * Get average hit time for a cache type
   * @param {string} cacheType - Cache type to check
   * @returns {number} Average hit time in ms
   */
  getAvgHitTime(cacheType) {
    const cache = this.metrics.cache[cacheType];
    if (!cache || cache.hits === 0) return 0;
    return cache.totalHitTimeMs / cache.hits;
  }

  /**
   * Get all hit rates
   * @returns {object} Hit rates for all cache types
   */
  getHitRates() {
    return {
      fileContent: this.getHitRate('fileContent'),
      metadata: this.getHitRate('metadata'),
      predictions: this.getHitRate('predictions'),
    };
  }

  /**
   * Get file I/O statistics
   * @returns {object} I/O statistics
   */
  getIOStats() {
    const { reads, writes, scans, readBytes, writeBytes, timings } = this.metrics.fileIO;

    const readTimings = timings.filter(t => t.type === 'read');
    const writeTimings = timings.filter(t => t.type === 'write');

    const avgReadTime = readTimings.length > 0
      ? readTimings.reduce((sum, t) => sum + t.durationMs, 0) / readTimings.length
      : 0;

    const avgWriteTime = writeTimings.length > 0
      ? writeTimings.reduce((sum, t) => sum + t.durationMs, 0) / writeTimings.length
      : 0;

    return {
      reads,
      writes,
      scans,
      readBytes,
      writeBytes,
      avgReadTimeMs: avgReadTime,
      avgWriteTimeMs: avgWriteTime,
    };
  }

  /**
   * Get memory write statistics
   * @returns {object} Memory write statistics
   */
  getMemoryStats() {
    const { batchedWrites, immediateWrites, patternRecords } = this.metrics.memory;
    const totalWrites = batchedWrites + immediateWrites;
    return {
      batchedWrites,
      immediateWrites,
      patternRecords,
      batchingEfficiency: totalWrites > 0 ? batchedWrites / totalWrites : 0,
    };
  }

  /**
   * Get command cache statistics
   * @returns {object} Command cache statistics
   */
  getCommandStats() {
    const { cached, loaded, definitions } = this.metrics.commands;
    return {
      cached,
      loaded,
      definitionsCount: definitions.size,
      hitRate: cached + loaded > 0 ? cached / (cached + loaded) : 0,
    };
  }

  /**
   * Get session uptime in milliseconds
   * @returns {number} Uptime in ms
   */
  getSessionUptime() {
    return Date.now() - this.sessionStart;
  }

  /**
   * Get complete performance report
   * @returns {object} Full performance report
   */
  getReport() {
    const hitRates = this.getHitRates();
    const ioStats = this.getIOStats();
    const memoryStats = this.getMemoryStats();
    const commandStats = this.getCommandStats();

    return {
      sessionUptime: this.getSessionUptime(),
      cache: {
        fileContent: {
          ...this.metrics.cache.fileContent,
          hitRate: hitRates.fileContent,
          avgHitTimeMs: this.getAvgHitTime('fileContent'),
        },
        metadata: {
          ...this.metrics.cache.metadata,
          hitRate: hitRates.metadata,
          avgHitTimeMs: this.getAvgHitTime('metadata'),
        },
        predictions: {
          ...this.metrics.cache.predictions,
          hitRate: hitRates.predictions,
          avgHitTimeMs: this.getAvgHitTime('predictions'),
        },
      },
      fileIO: ioStats,
      memory: memoryStats,
      commands: commandStats,
    };
  }

  /**
   * Get a summary string for logging
   * @returns {string} Human-readable summary
   */
  getSummary() {
    const hitRates = this.getHitRates();
    const memoryStats = this.getMemoryStats();
    const uptime = Math.round(this.getSessionUptime() / 1000);

    return [
      `Session: ${uptime}s`,
      `Cache hits: file=${(hitRates.fileContent * 100).toFixed(0)}%, meta=${(hitRates.metadata * 100).toFixed(0)}%, pred=${(hitRates.predictions * 100).toFixed(0)}%`,
      `I/O: ${this.metrics.fileIO.reads} reads, ${this.metrics.fileIO.writes} writes`,
      `Memory: ${memoryStats.batchedWrites} batched, ${memoryStats.immediateWrites} immediate (${(memoryStats.batchingEfficiency * 100).toFixed(0)}% efficient)`,
    ].join(' | ');
  }
}

// Singleton instance for global tracking
const tracker = new PerformanceTracker();

module.exports = {
  PerformanceTracker,
  tracker,
};
