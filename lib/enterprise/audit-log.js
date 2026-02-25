'use strict';

const crypto = require('crypto');

/**
 * Audit Log System
 *
 * Immutable, append-only log of all security-relevant actions.
 * Each entry includes who, what, when, where, and outcome.
 * Supports filtering, searching, and export for compliance.
 */
class AuditLog {
  /**
   * @param {object} [config={}]
   * @param {number} [config.maxEntries=10000] - Max entries to keep in memory
   * @param {boolean} [config.hashChain=true] - Enable hash chain integrity verification
   */
  constructor(config = {}) {
    this.maxEntries = config.maxEntries || 10000;
    this.hashChain = config.hashChain !== false;
    /** @type {AuditEntry[]} */
    this.entries = [];
    this._lastHash = '0';
  }

  /**
   * Log an action
   * @param {object} params
   * @param {string} params.userId - Who performed the action
   * @param {string} params.action - What was done (e.g. 'create_plan', 'delete_key')
   * @param {string} [params.resource] - What was acted upon
   * @param {string} [params.resourceId] - ID of the resource
   * @param {'success'|'failure'|'denied'} [params.outcome='success'] - Result
   * @param {object} [params.metadata] - Additional context
   * @param {string} [params.ip] - Source IP
   * @param {string} [params.sessionId] - Session identifier
   * @returns {AuditEntry}
   */
  log({ userId, action, resource, resourceId, outcome = 'success', metadata, ip, sessionId }) {
    const entry = {
      id: crypto.randomBytes(8).toString('hex'),
      timestamp: Date.now(),
      userId,
      action,
      resource: resource || null,
      resourceId: resourceId || null,
      outcome,
      metadata: metadata || null,
      ip: ip || null,
      sessionId: sessionId || null,
    };

    if (this.hashChain) {
      const content = `${this._lastHash}|${entry.id}|${entry.timestamp}|${entry.userId}|${entry.action}`;
      entry.hash = crypto.createHash('sha256').update(content).digest('hex');
      this._lastHash = entry.hash;
    }

    this.entries.push(entry);

    // Enforce max entries (FIFO)
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    return entry;
  }

  /**
   * Query entries with filters
   * @param {object} [filters={}]
   * @param {string} [filters.userId] - Filter by user
   * @param {string} [filters.action] - Filter by action
   * @param {string} [filters.resource] - Filter by resource type
   * @param {string} [filters.outcome] - Filter by outcome
   * @param {number} [filters.since] - Entries after this timestamp
   * @param {number} [filters.until] - Entries before this timestamp
   * @param {number} [filters.limit=100] - Max results
   * @param {number} [filters.offset=0] - Skip entries
   * @returns {AuditEntry[]}
   */
  query(filters = {}) {
    let results = this.entries;

    if (filters.userId) results = results.filter(e => e.userId === filters.userId);
    if (filters.action) results = results.filter(e => e.action === filters.action);
    if (filters.resource) results = results.filter(e => e.resource === filters.resource);
    if (filters.outcome) results = results.filter(e => e.outcome === filters.outcome);
    if (filters.since) results = results.filter(e => e.timestamp >= filters.since);
    if (filters.until) results = results.filter(e => e.timestamp <= filters.until);

    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * Get entries for a specific resource
   * @param {string} resource
   * @param {string} resourceId
   * @returns {AuditEntry[]}
   */
  getResourceHistory(resource, resourceId) {
    return this.entries.filter(e => e.resource === resource && e.resourceId === resourceId);
  }

  /**
   * Get a user's recent activity
   * @param {string} userId
   * @param {number} [limit=20]
   * @returns {AuditEntry[]}
   */
  getUserActivity(userId, limit = 20) {
    return this.entries.filter(e => e.userId === userId).slice(-limit);
  }

  /**
   * Verify hash chain integrity
   * @returns {{ valid: boolean, brokenAt: number|null }}
   */
  verifyIntegrity() {
    if (!this.hashChain) return { valid: true, brokenAt: null };

    let prevHash = '0';
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expected = crypto.createHash('sha256')
        .update(`${prevHash}|${entry.id}|${entry.timestamp}|${entry.userId}|${entry.action}`)
        .digest('hex');
      if (entry.hash !== expected) {
        return { valid: false, brokenAt: i };
      }
      prevHash = entry.hash;
    }
    return { valid: true, brokenAt: null };
  }

  /**
   * Get audit statistics
   * @returns {object}
   */
  getStats() {
    const actionCounts = {};
    const outcomeCounts = { success: 0, failure: 0, denied: 0 };
    const userCounts = {};

    for (const entry of this.entries) {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      outcomeCounts[entry.outcome] = (outcomeCounts[entry.outcome] || 0) + 1;
      userCounts[entry.userId] = (userCounts[entry.userId] || 0) + 1;
    }

    return {
      totalEntries: this.entries.length,
      actionCounts,
      outcomeCounts,
      uniqueUsers: Object.keys(userCounts).length,
      topUsers: Object.entries(userCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([userId, count]) => ({ userId, count })),
    };
  }

  /**
   * Export entries for compliance reporting
   * @param {object} [filters] - Same as query filters
   * @returns {{ entries: AuditEntry[], exportedAt: string, integrity: object }}
   */
  export(filters) {
    const entries = filters ? this.query(filters) : [...this.entries];
    return {
      entries,
      exportedAt: new Date().toISOString(),
      integrity: this.verifyIntegrity(),
      stats: this.getStats(),
    };
  }

  /**
   * Get total entry count
   * @returns {number}
   */
  size() {
    return this.entries.length;
  }

  /**
   * Clear all entries
   */
  clear() {
    this.entries = [];
    this._lastHash = '0';
  }
}

/**
 * @typedef {object} AuditEntry
 * @property {string} id
 * @property {number} timestamp
 * @property {string} userId
 * @property {string} action
 * @property {string|null} resource
 * @property {string|null} resourceId
 * @property {'success'|'failure'|'denied'} outcome
 * @property {object|null} metadata
 * @property {string|null} ip
 * @property {string|null} sessionId
 * @property {string} [hash]
 */

module.exports = { AuditLog };
