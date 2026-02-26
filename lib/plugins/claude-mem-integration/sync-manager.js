'use strict';

/**
 * Sync Manager for Claude-Mem Integration
 *
 * Manages batched synchronization of patterns from claude-mem to GYWD's GlobalMemory.
 * Handles queuing, batching, and conflict resolution.
 *
 * @module sync-manager
 */

/**
 * Sync state enumeration
 */
const SYNC_STATE = {
  STOPPED: 'stopped',
  RUNNING: 'running',
  SYNCING: 'syncing',
  ERROR: 'error',
};

/**
 * Sync Manager
 * Batches pattern imports to GlobalMemory
 */
class SyncManager {
  /**
   * Create sync manager
   * @param {Object} options - Configuration options
   * @param {Object} options.globalMemory - GYWD GlobalMemory instance
   * @param {number} options.batchSize - Number of patterns per batch (default: 100)
   * @param {number} options.syncInterval - Sync interval in ms (default: 30000)
   * @param {number} options.maxQueueSize - Maximum queue size (default: 10000)
   */
  constructor(options = {}) {
    this.globalMemory = options.globalMemory;
    this.batchSize = options.batchSize || 100;
    this.syncInterval = options.syncInterval || 30000;
    this.maxQueueSize = options.maxQueueSize || 10000;

    this._queue = [];
    this.state = SYNC_STATE.STOPPED;
    this.syncTimer = null;

    this.stats = {
      queued: 0,
      synced: 0,
      dropped: 0,
      errors: 0,
      batches: 0,
      lastSync: null,
      lastError: null,
    };
  }

  /**
   * Start the sync manager
   */
  start() {
    if (this.state === SYNC_STATE.RUNNING) {
      return;
    }

    this.state = SYNC_STATE.RUNNING;
    this._scheduleSync();
  }

  /**
   * Stop the sync manager
   */
  stop() {
    this._clearSyncTimer();
    this.state = SYNC_STATE.STOPPED;
  }

  /**
   * Queue a pattern for syncing
   * @param {Object} pattern - Pattern to queue
   * @returns {boolean} - Whether pattern was queued
   */
  queue(pattern) {
    if (!pattern) {
      return false;
    }

    // Check queue size limit
    if (this._queue.length >= this.maxQueueSize) {
      this.stats.dropped++;
      // Remove oldest item to make room
      this._queue.shift();
    }

    this._queue.push({
      pattern,
      queuedAt: Date.now(),
    });

    this.stats.queued++;

    // If batch size reached, trigger immediate sync
    if (this._queue.length >= this.batchSize) {
      this._syncBatch();
    }

    return true;
  }

  /**
   * Queue multiple patterns
   * @param {Array} patterns - Patterns to queue
   * @returns {number} - Number of patterns queued
   */
  queueBatch(patterns) {
    if (!Array.isArray(patterns)) {
      return 0;
    }

    let queued = 0;
    for (const pattern of patterns) {
      if (this.queue(pattern)) {
        queued++;
      }
    }

    return queued;
  }

  /**
   * Force flush all queued patterns
   * @returns {Promise<Object>} - Sync result
   */
  async flush() {
    if (this._queue.length === 0) {
      return { synced: 0, errors: 0 };
    }

    return this._syncBatch(true);
  }

  /**
   * Sync a batch of patterns
   * @param {boolean} all - Sync all queued patterns (default: false, sync up to batchSize)
   * @private
   */
  async _syncBatch(all = false) {
    if (this.state === SYNC_STATE.SYNCING) {
      return { synced: 0, errors: 0, skipped: true };
    }

    if (this._queue.length === 0) {
      return { synced: 0, errors: 0 };
    }

    this.state = SYNC_STATE.SYNCING;

    const count = all ? this._queue.length : Math.min(this.batchSize, this._queue.length);
    const batch = this._queue.splice(0, count);

    let synced = 0;
    let errors = 0;

    try {
      for (const item of batch) {
        try {
          this._importPattern(item.pattern);
          synced++;
        } catch (error) {
          errors++;
          this.stats.errors++;
          this.stats.lastError = error.message;
        }
      }

      // Save to disk
      if (synced > 0 && this.globalMemory) {
        this.globalMemory.save();
      }

      this.stats.synced += synced;
      this.stats.batches++;
      this.stats.lastSync = new Date().toISOString();

    } catch (error) {
      this.stats.errors++;
      this.stats.lastError = error.message;
    }

    this.state = SYNC_STATE.RUNNING;

    return { synced, errors };
  }

  /**
   * Import a pattern to GlobalMemory
   * @param {Object} pattern - Pattern to import
   * @private
   */
  _importPattern(pattern) {
    if (!this.globalMemory) {
      throw new Error('GlobalMemory not initialized');
    }

    // Check for existing pattern
    const existing = this._findExistingPattern(pattern);

    if (existing) {
      // Merge with existing pattern
      this._mergePattern(existing, pattern);
    } else {
      // Record new pattern
      this.globalMemory.recordPattern({
        type: pattern.type,
        pattern: pattern.pattern,
        confidence: pattern.confidence,
        source: pattern.sources?.[0] || 'claude-mem',
      });
    }
  }

  /**
   * Find existing pattern in GlobalMemory
   * @param {Object} pattern - Pattern to find
   * @returns {Object|null}
   * @private
   */
  _findExistingPattern(pattern) {
    if (!this.globalMemory) {
      return null;
    }

    const patterns = this.globalMemory.getPatternsByType(pattern.type);

    return patterns.find(p => p.pattern === pattern.pattern);
  }

  /**
   * Merge new pattern with existing
   * @param {Object} existing - Existing pattern
   * @param {Object} newPattern - New pattern to merge
   * @private
   */
  _mergePattern(existing, newPattern) {
    // Increment occurrences
    existing.occurrences = (existing.occurrences || 1) + (newPattern.occurrences || 1);

    // Add new sources
    if (newPattern.sources) {
      existing.sources = [...new Set([
        ...(existing.sources || []),
        ...newPattern.sources,
      ])];
    }

    // Boost confidence (capped at 0.95)
    existing.confidence = Math.min(
      (existing.confidence || 0.6) + 0.02,
      0.95,
    );

    // Update lastSeen
    if (newPattern.lastSeen && newPattern.lastSeen > (existing.lastSeen || '')) {
      existing.lastSeen = newPattern.lastSeen;
    }
  }

  /**
   * Schedule next sync
   * @private
   */
  _scheduleSync() {
    this._clearSyncTimer();

    if (this.state !== SYNC_STATE.RUNNING) {
      return;
    }

    this.syncTimer = setTimeout(async () => {
      await this._syncBatch();
      this._scheduleSync();
    }, this.syncInterval);
  }

  /**
   * Clear sync timer
   * @private
   */
  _clearSyncTimer() {
    if (this.syncTimer) {
      clearTimeout(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Get sync statistics
   * @returns {Object}
   */
  getStats() {
    return {
      ...this.stats,
      queueLength: this._queue.length,
      state: this.state,
    };
  }

  /**
   * Get queue length
   * @returns {number}
   */
  getQueueLength() {
    return this._queue.length;
  }

  /**
   * Get sync state
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      queued: 0,
      synced: 0,
      dropped: 0,
      errors: 0,
      batches: 0,
      lastSync: null,
      lastError: null,
    };
  }

  /**
   * Clear the queue without syncing
   */
  clearQueue() {
    const count = this._queue.length;
    this._queue = [];
    return count;
  }
}

module.exports = { SyncManager, SYNC_STATE };
