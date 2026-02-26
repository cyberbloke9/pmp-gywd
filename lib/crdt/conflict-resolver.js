'use strict';

/**
 * Conflict Resolver
 *
 * Detects and resolves conflicts from concurrent state changes.
 * Supports multiple merge strategies: last-writer-wins, field-level merge,
 * three-way merge, and custom resolution functions.
 */
class ConflictResolver {
  /**
   * @param {object} [config={}]
   * @param {string} [config.defaultStrategy='lww'] - 'lww' | 'field-merge' | 'three-way'
   * @param {object} [config.fieldStrategies={}] - Per-field strategy overrides
   */
  constructor(config = {}) {
    this.defaultStrategy = config.defaultStrategy || 'lww';
    /** @type {Record<string, string>} */
    this.fieldStrategies = config.fieldStrategies || {};
    /** @type {Array<{ timestamp: number, type: string, fields: string[], resolution: string }>} */
    this.conflictLog = [];
  }

  /**
   * Detect conflicts between two versions of a document
   * @param {object} base - Common ancestor version
   * @param {object} local - Local version
   * @param {object} remote - Remote version
   * @returns {{ hasConflicts: boolean, conflicts: Array }}
   */
  detectConflicts(base, local, remote) {
    const conflicts = [];
    const allFields = new Set([
      ...Object.keys(base || {}),
      ...Object.keys(local || {}),
      ...Object.keys(remote || {}),
    ]);

    for (const field of allFields) {
      if (field.startsWith('_')) continue; // Skip internal fields

      const baseVal = base?.[field];
      const localVal = local?.[field];
      const remoteVal = remote?.[field];

      // Both changed from base to different values
      const localChanged = !this._deepEqual(baseVal, localVal);
      const remoteChanged = !this._deepEqual(baseVal, remoteVal);
      const localRemoteDiffer = !this._deepEqual(localVal, remoteVal);

      if (localChanged && remoteChanged && localRemoteDiffer) {
        conflicts.push({ field, baseValue: baseVal, localValue: localVal, remoteValue: remoteVal });
      }
    }

    return { hasConflicts: conflicts.length > 0, conflicts };
  }

  /**
   * Resolve conflicts and produce a merged document
   * @param {object} base - Common ancestor
   * @param {object} local - Local version (with _timestamp for LWW)
   * @param {object} remote - Remote version (with _timestamp for LWW)
   * @returns {{ merged: object, resolutions: Array<{ field: string, strategy: string, value: * }> }}
   */
  resolve(base, local, remote) {
    const { conflicts } = this.detectConflicts(base, local, remote);
    const merged = { ...base };
    const resolutions = [];

    // Apply non-conflicting changes first
    const conflictFields = new Set(conflicts.map(c => c.field));
    for (const field of Object.keys(local || {})) {
      if (!conflictFields.has(field) && !field.startsWith('_')) {
        merged[field] = local[field];
      }
    }
    for (const field of Object.keys(remote || {})) {
      if (!conflictFields.has(field) && !field.startsWith('_')) {
        const localChanged = !this._deepEqual(base?.[field], local?.[field]);
        if (!localChanged) {
          merged[field] = remote[field];
        }
      }
    }

    // Resolve each conflict
    for (const conflict of conflicts) {
      const strategy = this.fieldStrategies[conflict.field] || this.defaultStrategy;
      const resolved = this._resolveField(conflict, strategy, local, remote);
      merged[conflict.field] = resolved.value;
      resolutions.push({
        field: conflict.field,
        strategy: resolved.strategy,
        value: resolved.value,
      });
    }

    // Log conflicts
    if (conflicts.length > 0) {
      this.conflictLog.push({
        timestamp: Date.now(),
        type: 'merge',
        fields: conflicts.map(c => c.field),
        resolution: resolutions.map(r => `${r.field}:${r.strategy}`).join(', '),
      });
    }

    return { merged, resolutions };
  }

  /**
   * Resolve a single field conflict
   * @private
   */
  _resolveField(conflict, strategy, local, remote) {
    switch (strategy) {
      case 'lww': {
        // Last-writer-wins: use timestamps
        const localTs = local?._timestamp || 0;
        const remoteTs = remote?._timestamp || 0;
        if (remoteTs > localTs) {
          return { value: conflict.remoteValue, strategy: 'lww-remote' };
        }
        return { value: conflict.localValue, strategy: 'lww-local' };
      }

      case 'local-wins':
        return { value: conflict.localValue, strategy: 'local-wins' };

      case 'remote-wins':
        return { value: conflict.remoteValue, strategy: 'remote-wins' };

      case 'concat': {
        // For string/array fields: concatenate
        if (Array.isArray(conflict.localValue) && Array.isArray(conflict.remoteValue)) {
          const merged = [...new Set([...conflict.localValue, ...conflict.remoteValue])];
          return { value: merged, strategy: 'concat-array' };
        }
        if (typeof conflict.localValue === 'string' && typeof conflict.remoteValue === 'string') {
          return { value: `${conflict.localValue}\n${conflict.remoteValue}`, strategy: 'concat-string' };
        }
        return { value: conflict.localValue, strategy: 'concat-fallback-local' };
      }

      case 'max': {
        // For numeric fields: take the max
        if (typeof conflict.localValue === 'number' && typeof conflict.remoteValue === 'number') {
          return { value: Math.max(conflict.localValue, conflict.remoteValue), strategy: 'max' };
        }
        return { value: conflict.localValue, strategy: 'max-fallback-local' };
      }

      case 'min': {
        if (typeof conflict.localValue === 'number' && typeof conflict.remoteValue === 'number') {
          return { value: Math.min(conflict.localValue, conflict.remoteValue), strategy: 'min' };
        }
        return { value: conflict.localValue, strategy: 'min-fallback-local' };
      }

      case 'field-merge': {
        // For objects: merge fields recursively
        if (this._isObject(conflict.localValue) && this._isObject(conflict.remoteValue)) {
          const subResolved = this.resolve(
            conflict.baseValue || {},
            conflict.localValue,
            conflict.remoteValue,
          );
          return { value: subResolved.merged, strategy: 'field-merge' };
        }
        return { value: conflict.localValue, strategy: 'field-merge-fallback-local' };
      }

      default:
        // Unknown strategy: default to local-wins
        return { value: conflict.localValue, strategy: 'unknown-fallback-local' };
    }
  }

  /**
   * Get conflict history
   * @param {number} [limit=50]
   * @returns {Array}
   */
  getConflictLog(limit = 50) {
    return this.conflictLog.slice(-limit);
  }

  /**
   * Get conflict stats
   * @returns {{ totalConflicts: number, fieldCounts: Record<string, number> }}
   */
  getStats() {
    const fieldCounts = {};
    for (const entry of this.conflictLog) {
      for (const field of entry.fields) {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      }
    }
    return {
      totalConflicts: this.conflictLog.length,
      fieldCounts,
    };
  }

  /**
   * Reset conflict log
   */
  resetLog() {
    this.conflictLog = [];
  }

  /**
   * @private
   */
  _deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    if (typeof a !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      return a.every((v, i) => this._deepEqual(v, b[i]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => this._deepEqual(a[key], b[key]));
  }

  /**
   * @private
   */
  _isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }
}

module.exports = { ConflictResolver };
