'use strict';

/**
 * CRDT Primitives
 *
 * Conflict-Free Replicated Data Types for distributed collaboration.
 * Pure JavaScript implementation — zero external dependencies.
 *
 * Implements: G-Counter, PN-Counter, LWW-Register, OR-Set
 */

/**
 * G-Counter (Grow-only Counter)
 *
 * Each node has its own counter that only increments.
 * The value is the sum of all node counters.
 * Merge takes max of each node's counter.
 */
class GCounter {
  /**
   * @param {string} nodeId - This node's unique identifier
   */
  constructor(nodeId) {
    this.nodeId = nodeId;
    /** @type {Map<string, number>} */
    this.counts = new Map();
  }

  /** Increment this node's counter */
  increment(amount = 1) {
    if (amount < 0) throw new Error('GCounter can only increment');
    const current = this.counts.get(this.nodeId) || 0;
    this.counts.set(this.nodeId, current + amount);
  }

  /** Get the total count across all nodes */
  value() {
    let total = 0;
    for (const count of this.counts.values()) {
      total += count;
    }
    return total;
  }

  /** Merge with another G-Counter (take max per node) */
  merge(other) {
    for (const [node, count] of other.counts) {
      const current = this.counts.get(node) || 0;
      this.counts.set(node, Math.max(current, count));
    }
  }

  /** Export state */
  export() {
    return { nodeId: this.nodeId, counts: Object.fromEntries(this.counts) };
  }

  /** Import state */
  static fromState(state) {
    const counter = new GCounter(state.nodeId);
    counter.counts = new Map(Object.entries(state.counts));
    return counter;
  }
}

/**
 * PN-Counter (Positive-Negative Counter)
 *
 * Supports both increment and decrement via two G-Counters.
 * Value = P (positive) - N (negative).
 */
class PNCounter {
  /**
   * @param {string} nodeId
   */
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.p = new GCounter(nodeId);
    this.n = new GCounter(nodeId);
  }

  /** Increment the counter */
  increment(amount = 1) {
    this.p.increment(amount);
  }

  /** Decrement the counter */
  decrement(amount = 1) {
    this.n.increment(amount);
  }

  /** Get the value (P - N) */
  value() {
    return this.p.value() - this.n.value();
  }

  /** Merge with another PN-Counter */
  merge(other) {
    this.p.merge(other.p);
    this.n.merge(other.n);
  }

  /** Export state */
  export() {
    return { nodeId: this.nodeId, p: this.p.export(), n: this.n.export() };
  }

  /** Import state */
  static fromState(state) {
    const counter = new PNCounter(state.nodeId);
    counter.p = GCounter.fromState(state.p);
    counter.n = GCounter.fromState(state.n);
    return counter;
  }
}

/**
 * LWW-Register (Last-Writer-Wins Register)
 *
 * Stores a single value. On conflict, the write with the
 * highest timestamp wins. Ties broken by node ID.
 */
class LWWRegister {
  /**
   * @param {string} nodeId
   * @param {*} [initialValue=null]
   */
  constructor(nodeId, initialValue = null) {
    this.nodeId = nodeId;
    this._value = initialValue;
    this._timestamp = 0;
    this._nodeId = nodeId; // Track which node wrote the value
  }

  /** Set the value with current timestamp */
  set(value) {
    this._value = value;
    this._timestamp = Date.now();
    this._nodeId = this.nodeId;
  }

  /** Set with explicit timestamp (for testing/sync) */
  setWithTimestamp(value, timestamp) {
    if (timestamp > this._timestamp ||
        (timestamp === this._timestamp && this.nodeId > this._nodeId)) {
      this._value = value;
      this._timestamp = timestamp;
      this._nodeId = this.nodeId;
    }
  }

  /** Get the current value */
  value() {
    return this._value;
  }

  /** Get the timestamp of the last write */
  timestamp() {
    return this._timestamp;
  }

  /** Merge with another register (last writer wins) */
  merge(other) {
    if (other._timestamp > this._timestamp ||
        (other._timestamp === this._timestamp && other._nodeId > this._nodeId)) {
      this._value = other._value;
      this._timestamp = other._timestamp;
      this._nodeId = other._nodeId;
    }
  }

  /** Export state */
  export() {
    return {
      nodeId: this.nodeId,
      value: this._value,
      timestamp: this._timestamp,
      writerNodeId: this._nodeId,
    };
  }

  /** Import state */
  static fromState(state) {
    const reg = new LWWRegister(state.nodeId);
    reg._value = state.value;
    reg._timestamp = state.timestamp;
    reg._nodeId = state.writerNodeId;
    return reg;
  }
}

/**
 * OR-Set (Observed-Remove Set)
 *
 * Supports add and remove. An element can be re-added after removal.
 * Each add creates a unique tag; remove only removes observed tags.
 */
class ORSet {
  /**
   * @param {string} nodeId
   */
  constructor(nodeId) {
    this.nodeId = nodeId;
    /** @type {Map<string, Set<string>>} element → set of unique tags */
    this.elements = new Map();
    /** @type {Set<string>} tombstoned tags */
    this.tombstones = new Set();
    this._tagCounter = 0;
  }

  /** Generate a unique tag for this node */
  _newTag() {
    return `${this.nodeId}:${++this._tagCounter}`;
  }

  /** Add an element */
  add(element) {
    const key = String(element);
    const tag = this._newTag();
    if (!this.elements.has(key)) {
      this.elements.set(key, new Set());
    }
    this.elements.get(key).add(tag);
  }

  /** Remove an element (removes all observed tags) */
  remove(element) {
    const key = String(element);
    const tags = this.elements.get(key);
    if (tags) {
      for (const tag of tags) {
        this.tombstones.add(tag);
      }
      this.elements.delete(key);
    }
  }

  /** Check if element is in the set */
  has(element) {
    const key = String(element);
    const tags = this.elements.get(key);
    return tags !== undefined && tags.size > 0;
  }

  /** Get all elements in the set */
  values() {
    return [...this.elements.keys()];
  }

  /** Get the set size */
  size() {
    return this.elements.size;
  }

  /** Merge with another OR-Set */
  merge(other) {
    // Add all tags from other that aren't tombstoned
    for (const [element, otherTags] of other.elements) {
      if (!this.elements.has(element)) {
        this.elements.set(element, new Set());
      }
      const localTags = this.elements.get(element);
      for (const tag of otherTags) {
        if (!this.tombstones.has(tag)) {
          localTags.add(tag);
        }
      }
    }

    // Apply other's tombstones
    for (const tag of other.tombstones) {
      this.tombstones.add(tag);
      // Remove tombstoned tags from elements
      for (const [element, tags] of this.elements) {
        tags.delete(tag);
        if (tags.size === 0) {
          this.elements.delete(element);
        }
      }
    }

    // Update tag counter to avoid collisions
    this._tagCounter = Math.max(this._tagCounter, other._tagCounter);
  }

  /** Export state */
  export() {
    const elements = {};
    for (const [key, tags] of this.elements) {
      elements[key] = [...tags];
    }
    return {
      nodeId: this.nodeId,
      elements,
      tombstones: [...this.tombstones],
      tagCounter: this._tagCounter,
    };
  }

  /** Import state */
  static fromState(state) {
    const set = new ORSet(state.nodeId);
    for (const [key, tags] of Object.entries(state.elements)) {
      set.elements.set(key, new Set(tags));
    }
    set.tombstones = new Set(state.tombstones);
    set._tagCounter = state.tagCounter;
    return set;
  }
}

module.exports = { GCounter, PNCounter, LWWRegister, ORSet };
