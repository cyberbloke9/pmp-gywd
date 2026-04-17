'use strict';

/**
 * Cloud Sync
 *
 * Remote state storage and synchronization.
 * Part of Phase 35: Cloud Sync Core.
 */

const { EventEmitter } = require('events');
const _fs = require('fs');
const _path = require('path');

/**
 * Sync status
 */
const SYNC_STATUS = {
  SYNCED: 'synced',
  PENDING: 'pending',
  SYNCING: 'syncing',
  CONFLICT: 'conflict',
  ERROR: 'error',
  OFFLINE: 'offline',
};

/**
 * Conflict resolution strategies
 */
const CONFLICT_STRATEGY = {
  LOCAL_WINS: 'local_wins',
  REMOTE_WINS: 'remote_wins',
  MERGE: 'merge',
  MANUAL: 'manual',
};

/**
 * Cloud Sync Manager
 */
class CloudSyncManager extends EventEmitter {
  constructor(options = {}) {
    super();

    this.localDir = options.localDir || '.gywd/sync';
    this.remoteUrl = options.remoteUrl || null;
    this.conflictStrategy = options.conflictStrategy || CONFLICT_STRATEGY.MERGE;
    this.autoSync = options.autoSync || false;
    this.syncInterval = options.syncInterval || 30000;

    this.status = SYNC_STATUS.OFFLINE;
    this.lastSync = null;
    this.pendingChanges = [];
    this.syncHistory = [];
    this.conflicts = [];

    this._syncTimer = null;

    if (this.autoSync && this.remoteUrl) {
      this._startAutoSync();
    }
  }

  /**
   * Connect to remote storage
   * @param {string} url - Remote URL
   * @param {object} auth - Authentication credentials
   * @returns {Promise<boolean>}
   */
  async connect(url, auth = {}) {
    this.remoteUrl = url;
    this.auth = auth;

    try {
      // Simulate connection (in real system, would authenticate)
      await this._simulateNetwork(100);

      this.status = SYNC_STATUS.SYNCED;
      this.emit('connected', { url });

      if (this.autoSync) {
        this._startAutoSync();
      }

      return true;
    } catch (error) {
      this.status = SYNC_STATUS.ERROR;
      this.emit('error', { error: error.message });
      return false;
    }
  }

  /**
   * Disconnect from remote
   */
  disconnect() {
    this._stopAutoSync();
    this.status = SYNC_STATUS.OFFLINE;
    this.remoteUrl = null;
    this.emit('disconnected');
  }

  /**
   * Push local changes to remote
   * @param {object} data - Data to sync
   * @param {string} key - Storage key
   * @returns {Promise<object>}
   */
  async push(data, key) {
    if (!this.remoteUrl) {
      throw new Error('Not connected to remote');
    }

    this.status = SYNC_STATUS.SYNCING;
    this.emit('syncStarted', { type: 'push', key });

    try {
      // Check for conflicts
      const remoteVersion = await this._fetchRemote(key);

      if (remoteVersion && remoteVersion.version !== data.version) {
        const conflict = await this._handleConflict(data, remoteVersion, key);
        if (conflict.hasConflict) {
          return conflict;
        }
        data = conflict.resolved;
      }

      // Simulate push
      await this._simulateNetwork(200);

      const result = {
        key,
        version: (data.version || 0) + 1,
        timestamp: Date.now(),
        success: true,
      };

      this._recordSync('push', key, result);
      this.status = SYNC_STATUS.SYNCED;
      this.lastSync = Date.now();
      this.emit('syncCompleted', { type: 'push', key, result });

      return result;
    } catch (error) {
      this.status = SYNC_STATUS.ERROR;
      this.emit('syncError', { type: 'push', key, error: error.message });
      throw error;
    }
  }

  /**
   * Pull remote changes to local
   * @param {string} key - Storage key
   * @returns {Promise<object>}
   */
  async pull(key) {
    if (!this.remoteUrl) {
      throw new Error('Not connected to remote');
    }

    this.status = SYNC_STATUS.SYNCING;
    this.emit('syncStarted', { type: 'pull', key });

    try {
      const remoteData = await this._fetchRemote(key);

      if (!remoteData) {
        return { key, data: null, notFound: true };
      }

      this._recordSync('pull', key, { version: remoteData.version });
      this.status = SYNC_STATUS.SYNCED;
      this.lastSync = Date.now();
      this.emit('syncCompleted', { type: 'pull', key, version: remoteData.version });

      return {
        key,
        data: remoteData.data,
        version: remoteData.version,
        success: true,
      };
    } catch (error) {
      this.status = SYNC_STATUS.ERROR;
      this.emit('syncError', { type: 'pull', key, error: error.message });
      throw error;
    }
  }

  /**
   * Sync bidirectionally
   * @param {string} key - Storage key
   * @param {object} localData - Local data
   * @returns {Promise<object>}
   */
  async sync(key, localData) {
    const remoteData = await this.pull(key);

    if (!remoteData.data) {
      // No remote data, push local
      return this.push(localData, key);
    }

    // Compare versions
    const localVersion = localData.version || 0;
    const remoteVersion = remoteData.version || 0;

    if (localVersion > remoteVersion) {
      // Local is newer, push
      return this.push(localData, key);
    } else if (remoteVersion > localVersion) {
      // Remote is newer, use remote
      return remoteData;
    } else {
      // Same version, check for changes
      const hasChanges = JSON.stringify(localData.data) !== JSON.stringify(remoteData.data);

      if (hasChanges) {
        return this._handleConflict(localData, remoteData, key);
      }

      return { key, synced: true, version: remoteVersion };
    }
  }

  /**
   * Handle sync conflict
   * @param {object} local
   * @param {object} remote
   * @param {string} key
   * @returns {Promise<object>}
   */
  async _handleConflict(local, remote, key) {
    const conflict = {
      key,
      local: local.data,
      remote: remote.data,
      localVersion: local.version,
      remoteVersion: remote.version,
      timestamp: Date.now(),
    };

    this.conflicts.push(conflict);
    this.status = SYNC_STATUS.CONFLICT;
    this.emit('conflict', conflict);

    switch (this.conflictStrategy) {
      case CONFLICT_STRATEGY.LOCAL_WINS:
        return { resolved: local, hasConflict: false };

      case CONFLICT_STRATEGY.REMOTE_WINS:
        return { resolved: remote, hasConflict: false };

      case CONFLICT_STRATEGY.MERGE:
        const merged = this._mergeData(local.data, remote.data);
        return {
          resolved: { data: merged, version: Math.max(local.version || 0, remote.version || 0) + 1 },
          hasConflict: false,
        };

      case CONFLICT_STRATEGY.MANUAL:
      default:
        return { hasConflict: true, conflict };
    }
  }

  /**
   * Merge two data objects safely — strips prototype-pollution keys and
   * uses prototype-less objects for the merged result.
   */
  _mergeData(local, remote) {
    if (typeof local !== 'object' || local === null || typeof remote !== 'object' || remote === null) {
      // For non-objects, prefer remote
      return remote;
    }
    if (Array.isArray(local) || Array.isArray(remote)) {
      // Arrays merge by taking remote (can't safely combine without schema)
      return Array.isArray(remote) ? [...remote] : local;
    }

    // Use Object.create(null) so even if __proto__ somehow slips in, it's a data property
    const merged = Object.create(null);
    for (const [k, v] of Object.entries(local)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
      merged[k] = v;
    }

    for (const [key, value] of Object.entries(remote)) {
      // REJECT prototype-pollution keys — never merge them
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;

      if (!(key in merged)) {
        merged[key] = value;
      } else if (typeof value === 'object' && value !== null &&
                 typeof merged[key] === 'object' && merged[key] !== null) {
        merged[key] = this._mergeData(merged[key], value);
      } else {
        // For conflicting primitives, prefer remote
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Fetch from remote (simulated)
   * @param {string} key
   * @returns {Promise<object|null>}
   */
  async _fetchRemote(_key) {
    await this._simulateNetwork(100);

    // Simulated remote storage
    return {
      data: {},
      version: 1,
      timestamp: Date.now() - 10000,
    };
  }

  /**
   * Simulate network latency
   * @param {number} ms
   * @returns {Promise}
   */
  _simulateNetwork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Record sync in history
   * @param {string} type
   * @param {string} key
   * @param {object} result
   */
  _recordSync(type, key, result) {
    this.syncHistory.push({
      type,
      key,
      result,
      timestamp: Date.now(),
    });

    if (this.syncHistory.length > 100) {
      this.syncHistory = this.syncHistory.slice(-100);
    }
  }

  /**
   * Start auto-sync timer
   */
  _startAutoSync() {
    if (this._syncTimer) return;

    this._syncTimer = setInterval(() => {
      this.emit('autoSyncTick');
    }, this.syncInterval);
  }

  /**
   * Stop auto-sync timer
   */
  _stopAutoSync() {
    if (this._syncTimer) {
      clearInterval(this._syncTimer);
      this._syncTimer = null;
    }
  }

  /**
   * Resolve a conflict manually
   * @param {string} key
   * @param {string} resolution - 'local' or 'remote'
   * @returns {object}
   */
  resolveConflict(key, resolution) {
    const conflictIndex = this.conflicts.findIndex(c => c.key === key);

    if (conflictIndex === -1) {
      throw new Error(`No conflict found for key: ${key}`);
    }

    const conflict = this.conflicts[conflictIndex];
    this.conflicts.splice(conflictIndex, 1);

    const resolved = resolution === 'local' ? conflict.local : conflict.remote;

    if (this.conflicts.length === 0) {
      this.status = SYNC_STATUS.SYNCED;
    }

    this.emit('conflictResolved', { key, resolution });
    return { resolved };
  }

  /**
   * Get sync status
   * @returns {object}
   */
  getStatus() {
    return {
      status: this.status,
      connected: this.remoteUrl !== null,
      remoteUrl: this.remoteUrl,
      lastSync: this.lastSync,
      pendingChanges: this.pendingChanges.length,
      conflicts: this.conflicts.length,
      autoSync: this.autoSync,
    };
  }
}

module.exports = {
  CloudSyncManager,
  SYNC_STATUS,
  CONFLICT_STRATEGY,
};
