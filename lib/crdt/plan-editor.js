'use strict';

const { LWWRegister, ORSet } = require('./base-crdt');

/**
 * Collaborative Plan Editor
 *
 * Multi-user plan editing backed by CRDTs for conflict-free merging.
 * Each plan field uses an LWW-Register; task lists use OR-Sets.
 * All operations are tracked in an operation log for replay/undo.
 */
class PlanEditor {
  /**
   * @param {string} nodeId - This user/node's unique identifier
   * @param {string} [planId] - Plan identifier
   */
  constructor(nodeId, planId = 'default') {
    this.nodeId = nodeId;
    this.planId = planId;

    // LWW-Registers for scalar fields
    /** @type {Map<string, LWWRegister>} */
    this.fields = new Map();
    this._initField('title', '');
    this._initField('description', '');
    this._initField('status', 'draft');
    this._initField('phase', '');

    // OR-Set for tasks
    this.tasks = new ORSet(nodeId);

    // Operation log for history/undo
    /** @type {Array<{ op: string, field: string, value: *, nodeId: string, timestamp: number }>} */
    this.operations = [];

    // Active editors tracking
    /** @type {Map<string, { nodeId: string, lastSeen: number, cursor?: string }>} */
    this.editors = new Map();
    this.editors.set(nodeId, { nodeId, lastSeen: Date.now() });
  }

  /**
   * Initialize a field with LWW-Register
   * @private
   */
  _initField(name, defaultValue) {
    this.fields.set(name, new LWWRegister(this.nodeId, defaultValue));
  }

  /**
   * Set a plan field value
   * @param {string} field - Field name (title, description, status, phase, or custom)
   * @param {*} value - New value
   */
  setField(field, value) {
    if (!this.fields.has(field)) {
      this._initField(field, null);
    }
    this.fields.get(field).set(value);
    this._logOp('set_field', field, value);
  }

  /**
   * Get a plan field value
   * @param {string} field
   * @returns {*}
   */
  getField(field) {
    const reg = this.fields.get(field);
    return reg ? reg.value() : undefined;
  }

  /**
   * Add a task to the plan
   * @param {string} taskId - Unique task identifier
   */
  addTask(taskId) {
    this.tasks.add(taskId);
    this._logOp('add_task', 'tasks', taskId);
  }

  /**
   * Remove a task from the plan
   * @param {string} taskId
   */
  removeTask(taskId) {
    this.tasks.remove(taskId);
    this._logOp('remove_task', 'tasks', taskId);
  }

  /**
   * Check if a task exists
   * @param {string} taskId
   * @returns {boolean}
   */
  hasTask(taskId) {
    return this.tasks.has(taskId);
  }

  /**
   * Get all tasks
   * @returns {string[]}
   */
  getTasks() {
    return this.tasks.values();
  }

  /**
   * Get the full plan state
   * @returns {object}
   */
  getPlan() {
    const plan = { planId: this.planId };
    for (const [name, reg] of this.fields) {
      plan[name] = reg.value();
    }
    plan.tasks = this.tasks.values();
    plan.editors = this.getActiveEditors();
    return plan;
  }

  /**
   * Register an editor's presence
   * @param {string} editorId
   * @param {string} [cursor] - Current cursor position/section
   */
  registerEditor(editorId, cursor) {
    this.editors.set(editorId, { nodeId: editorId, lastSeen: Date.now(), cursor });
  }

  /**
   * Remove an editor
   * @param {string} editorId
   */
  removeEditor(editorId) {
    this.editors.delete(editorId);
  }

  /**
   * Get active editors (seen in last 60 seconds)
   * @returns {Array<{ nodeId: string, lastSeen: number, cursor?: string }>}
   */
  getActiveEditors() {
    const cutoff = Date.now() - 60000;
    return [...this.editors.values()].filter(e => e.lastSeen > cutoff);
  }

  /**
   * Merge with another PlanEditor's state
   * @param {PlanEditor} other
   */
  merge(other) {
    // Merge each field register
    for (const [name, otherReg] of other.fields) {
      if (!this.fields.has(name)) {
        this._initField(name, null);
      }
      this.fields.get(name).merge(otherReg);
    }

    // Merge task set
    this.tasks.merge(other.tasks);

    // Merge operations (append remote ops we haven't seen)
    const myOpSet = new Set(this.operations.map(o => `${o.nodeId}:${o.timestamp}`));
    for (const op of other.operations) {
      const key = `${op.nodeId}:${op.timestamp}`;
      if (!myOpSet.has(key)) {
        this.operations.push(op);
      }
    }
    this.operations.sort((a, b) => a.timestamp - b.timestamp);

    // Merge editor presence
    for (const [id, editor] of other.editors) {
      const existing = this.editors.get(id);
      if (!existing || editor.lastSeen > existing.lastSeen) {
        this.editors.set(id, editor);
      }
    }
  }

  /**
   * Get operation history
   * @param {number} [limit=50]
   * @returns {Array}
   */
  getHistory(limit = 50) {
    return this.operations.slice(-limit);
  }

  /**
   * Get operations by a specific editor
   * @param {string} editorId
   * @returns {Array}
   */
  getEditorOps(editorId) {
    return this.operations.filter(o => o.nodeId === editorId);
  }

  /**
   * Export full state for persistence/sync
   * @returns {object}
   */
  export() {
    const fields = {};
    for (const [name, reg] of this.fields) {
      fields[name] = reg.export();
    }
    return {
      nodeId: this.nodeId,
      planId: this.planId,
      fields,
      tasks: this.tasks.export(),
      operations: this.operations,
      editors: Object.fromEntries(this.editors),
    };
  }

  /**
   * Import state
   * @param {object} state
   * @returns {PlanEditor}
   */
  static fromState(state) {
    const editor = new PlanEditor(state.nodeId, state.planId);
    for (const [name, regState] of Object.entries(state.fields)) {
      editor.fields.set(name, LWWRegister.fromState(regState));
    }
    editor.tasks = ORSet.fromState(state.tasks);
    editor.operations = state.operations || [];
    editor.editors = new Map(Object.entries(state.editors || {}));
    return editor;
  }

  /**
   * @private
   */
  _logOp(op, field, value) {
    this.operations.push({
      op,
      field,
      value,
      nodeId: this.nodeId,
      timestamp: Date.now(),
    });
  }
}

module.exports = { PlanEditor };
