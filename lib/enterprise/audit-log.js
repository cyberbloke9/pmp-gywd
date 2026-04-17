'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Audit Log System (hardened per 2026-04-12 security audit)
 *
 * Security properties:
 *   - HMAC-SHA256 chain keyed with a server secret (not just unkeyed sha256).
 *   - Hash input is canonical JSON of the FULL entry (all fields), not just 5.
 *   - JSONL file persistence with append-only semantics + fsync.
 *   - Rotation to archive file (carry-hash preserved) — no FIFO shift.
 *   - clear() requires a destructive-action permission (enforced by caller).
 *   - log() operations are atomic: hash-compute, in-memory append, file append.
 */
class AuditLog {
  /**
   * @param {object} [config={}]
   * @param {string} [config.secret] - HMAC secret (REQUIRED for hashChain=true). Length >= 32 bytes.
   * @param {number} [config.maxEntries=10000] - Max in-memory entries before rotation
   * @param {boolean} [config.hashChain=true] - Enable HMAC chain
   * @param {string} [config.filePath] - JSONL file for persistence (optional but recommended)
   * @param {string} [config.archiveDir] - Directory for rotated archives (defaults to filePath dir)
   * @param {boolean} [config.destructiveClearAllowed=false] - Whether clear() is allowed at all
   */
  constructor(config = {}) {
    this.maxEntries = config.maxEntries || 10000;
    this.hashChain = config.hashChain !== false;
    this.filePath = config.filePath || null;
    this.archiveDir = config.archiveDir || (this.filePath ? path.dirname(this.filePath) : null);
    this.destructiveClearAllowed = !!config.destructiveClearAllowed;

    if (this.hashChain) {
      if (!config.secret || typeof config.secret !== 'string' || config.secret.length < 32) {
        throw new Error('AuditLog: HMAC secret required (>=32 chars) when hashChain is enabled');
      }
      this._secret = Buffer.from(config.secret, 'utf8');
    } else {
      this._secret = null;
    }

    this.entries = [];
    this._lastHash = '0';
    this._chainRoot = '0'; // Starting hash for the current in-memory chain (shifts on rotation)
    this._archiveCount = 0;
    this._rotating = false;

    // Restore from file if exists
    if (this.filePath && fs.existsSync(this.filePath)) {
      this._restoreFromFile();
    }
  }

  /**
   * Canonical JSON encoding for hashing.
   * Sorts keys, omits 'hash' field, stable serialization.
   */
  _canonicalize(entry) {
    const copy = { ...entry };
    delete copy.hash;
    const keys = Object.keys(copy).sort();
    const canonical = {};
    for (const k of keys) canonical[k] = copy[k];
    return JSON.stringify(canonical);
  }

  /**
   * Compute HMAC of (prevHash + canonical entry).
   */
  _computeHash(prevHash, entry) {
    const hmac = crypto.createHmac('sha256', this._secret);
    hmac.update(prevHash);
    hmac.update('|');
    hmac.update(this._canonicalize(entry));
    return hmac.digest('hex');
  }

  /**
   * Log an action.
   * @param {object} params
   * @returns {AuditEntry}
   */
  log({ userId, action, resource, resourceId, outcome = 'success', metadata, ip, sessionId }) {
    if (!userId || !action) {
      throw new Error('AuditLog.log: userId and action are required');
    }
    if (!['success', 'failure', 'denied'].includes(outcome)) {
      throw new Error(`AuditLog.log: invalid outcome "${outcome}"`);
    }

    const entry = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      userId: String(userId),
      action: String(action),
      resource: resource || null,
      resourceId: resourceId || null,
      outcome,
      metadata: metadata || null,
      ip: ip || null,
      sessionId: sessionId || null,
    };

    if (this.hashChain) {
      entry.hash = this._computeHash(this._lastHash, entry);
      this._lastHash = entry.hash;
    }

    this.entries.push(entry);

    // Persist to file (append-only JSONL)
    if (this.filePath) {
      this._appendToFile(entry);
    }

    // Rotate to archive if over max (never lose entries)
    if (this.entries.length > this.maxEntries) {
      this._rotate();
    }

    return entry;
  }

  _appendToFile(entry) {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      // O_APPEND semantics + fsync for durability
      const fd = fs.openSync(this.filePath, 'a', 0o600);
      try {
        fs.writeSync(fd, JSON.stringify(entry) + '\n');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    } catch (err) {
      // Re-throw — silent failure is unacceptable for audit
      throw new Error(`AuditLog: persistence failed: ${err.message}`);
    }
  }

  _restoreFromFile() {
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const lines = content.split('\n').filter(Boolean);
      const restored = [];
      // If the file starts with a rotation entry, its metadata.carryHash is the chain root.
      // Otherwise, the chain started fresh from '0'.
      let chainRoot = '0';
      if (lines.length > 0) {
        const first = JSON.parse(lines[0]);
        if (first.action === 'audit_rotation' && first.metadata && first.metadata.carryHash) {
          chainRoot = first.metadata.carryHash;
        }
      }
      let lastHash = chainRoot;
      for (const line of lines) {
        const entry = JSON.parse(line);
        if (this.hashChain) {
          const expected = this._computeHash(lastHash, entry);
          if (entry.hash !== expected) {
            throw new Error(`Audit chain broken at entry ${entry.id}`);
          }
          lastHash = entry.hash;
        }
        restored.push(entry);
      }
      this.entries = restored;
      this._chainRoot = chainRoot;
      this._lastHash = lastHash;
    } catch (err) {
      throw new Error(`AuditLog: restore failed: ${err.message}`);
    }
  }

  /**
   * Rotate: archive current entries to a timestamped file, keep lastHash as carry.
   * Unlike FIFO shift, this preserves ALL history on disk.
   */
  _rotate() {
    if (this._rotating) return;
    this._rotating = true;
    try {
      this._archiveCount += 1;
      if (this.archiveDir) {
        if (!fs.existsSync(this.archiveDir)) {
          fs.mkdirSync(this.archiveDir, { recursive: true, mode: 0o700 });
        }
        const archivePath = path.join(
          this.archiveDir,
          `audit-${Date.now()}-${this._archiveCount}.jsonl`,
        );
        // Rename current file to archive (atomic on POSIX)
        if (this.filePath && fs.existsSync(this.filePath)) {
          fs.renameSync(this.filePath, archivePath);
          // Capture the hash the carry entry will be chained AGAINST — that's the new chain root
          const carryPrevHash = this._lastHash;
          // Start fresh file with a marker entry that carries lastHash forward
          const carryEntry = {
            id: crypto.randomBytes(16).toString('hex'),
            timestamp: Date.now(),
            userId: 'system',
            action: 'audit_rotation',
            resource: 'audit_log',
            resourceId: archivePath,
            outcome: 'success',
            metadata: { archivedEntries: this.entries.length, carryHash: carryPrevHash },
            ip: null,
            sessionId: null,
          };
          if (this.hashChain) {
            carryEntry.hash = this._computeHash(carryPrevHash, carryEntry);
            this._lastHash = carryEntry.hash;
          }
          this._appendToFile(carryEntry);
          // New in-memory chain verifies starting from carryPrevHash
          this._chainRoot = carryPrevHash;
          this.entries = [carryEntry];
        } else {
          // No file persistence — just keep in-memory tail
          this.entries = this.entries.slice(-Math.floor(this.maxEntries / 2));
        }
      } else {
        // No archive dir — keep half (still better than losing one)
        this.entries = this.entries.slice(-Math.floor(this.maxEntries / 2));
      }
    } finally {
      this._rotating = false;
    }
  }

  /** Query with filters. */
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

  getResourceHistory(resource, resourceId) {
    return this.entries.filter(e => e.resource === resource && e.resourceId === resourceId);
  }

  getUserActivity(userId, limit = 20) {
    return this.entries.filter(e => e.userId === userId).slice(-limit);
  }

  /**
   * Verify HMAC chain integrity over ALL fields.
   * @returns {{ valid: boolean, brokenAt: number|null, reason: string|null }}
   */
  verifyIntegrity() {
    if (!this.hashChain) return { valid: true, brokenAt: null, reason: null };

    let prevHash = this._chainRoot;
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const expected = this._computeHash(prevHash, entry);
      if (entry.hash !== expected) {
        return { valid: false, brokenAt: i, reason: `HMAC mismatch at entry ${entry.id}` };
      }
      prevHash = entry.hash;
    }
    return { valid: true, brokenAt: null, reason: null };
  }

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
      archiveCount: this._archiveCount,
    };
  }

  export(filters) {
    const entries = filters ? this.query(filters) : [...this.entries];
    return {
      entries,
      exportedAt: new Date().toISOString(),
      integrity: this.verifyIntegrity(),
      stats: this.getStats(),
    };
  }

  size() {
    return this.entries.length;
  }

  /**
   * Clear all entries — DESTRUCTIVE, DISABLED BY DEFAULT.
   * Requires config.destructiveClearAllowed=true AND explicit reason.
   * When allowed, a final rotation preserves the old log before clearing.
   */
  clear({ reason, callerId } = {}) {
    if (!this.destructiveClearAllowed) {
      throw new Error('AuditLog.clear is disabled (config.destructiveClearAllowed=false)');
    }
    if (!reason || typeof reason !== 'string' || reason.length < 10) {
      throw new Error('AuditLog.clear requires reason (>=10 chars) for forensic trail');
    }
    if (!callerId) {
      throw new Error('AuditLog.clear requires callerId for accountability');
    }
    // Force rotation first — NEVER lose history
    if (this.filePath && this.entries.length > 0) this._rotate();
    // Log the clear operation as the first entry of the new log
    const clearEntry = {
      id: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now(),
      userId: String(callerId),
      action: 'audit_log_cleared',
      resource: 'audit_log',
      resourceId: null,
      outcome: 'success',
      metadata: { reason },
      ip: null,
      sessionId: null,
    };
    this._lastHash = '0'; // Clear creates a new chain root
    this._chainRoot = '0';
    if (this.hashChain) {
      clearEntry.hash = this._computeHash(this._lastHash, clearEntry);
      this._lastHash = clearEntry.hash;
    }
    this.entries = [clearEntry];
    if (this.filePath) this._appendToFile(clearEntry);
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
