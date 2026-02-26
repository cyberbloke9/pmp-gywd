'use strict';

/**
 * Base Agent
 *
 * Abstract base class for all executable agents in the GYWD system.
 * Provides lifecycle management, context handling, and result collection.
 * Part of Phase 29: Agent Runtime.
 */

const { EventEmitter } = require('events');

/**
 * Agent lifecycle states
 */
const AGENT_STATE = {
  IDLE: 'idle',
  SPAWNING: 'spawning',
  RUNNING: 'running',
  COLLECTING: 'collecting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

/**
 * Agent priority levels
 */
const AGENT_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
  BACKGROUND: 5,
};

/**
 * Base Agent class
 */
class BaseAgent extends EventEmitter {
  /**
   * Create a new agent
   * @param {object} options - Agent options
   * @param {string} options.name - Agent name
   * @param {string} options.type - Agent type identifier
   * @param {number} options.priority - Execution priority (1-5)
   * @param {number} options.timeout - Execution timeout in ms
   * @param {object} options.context - Initial context
   */
  constructor(options = {}) {
    super();

    this.id = this._generateId();
    this.name = options.name || 'Unnamed Agent';
    this.type = options.type || 'base';
    this.priority = options.priority || AGENT_PRIORITY.NORMAL;
    this.timeout = options.timeout || 30000;

    this.state = AGENT_STATE.IDLE;
    this.context = options.context || {};
    this.results = null;
    this.error = null;

    this.startTime = null;
    this.endTime = null;
    this.metadata = {};
  }

  /**
   * Generate unique agent ID
   * @returns {string}
   */
  _generateId() {
    return `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Spawn the agent (prepare for execution)
   * @param {object} input - Input data for the agent
   * @returns {Promise<boolean>}
   */
  async spawn(input = {}) {
    if (this.state !== AGENT_STATE.IDLE) {
      throw new Error(`Cannot spawn agent in state: ${this.state}`);
    }

    this.state = AGENT_STATE.SPAWNING;
    this.emit('spawning', { agentId: this.id, input });

    try {
      // Merge input with existing context
      this.context = { ...this.context, ...input };

      // Allow subclasses to perform initialization
      await this.onSpawn(input);

      this.emit('spawned', { agentId: this.id });
      return true;
    } catch (error) {
      this.state = AGENT_STATE.FAILED;
      this.error = error;
      this.emit('error', { agentId: this.id, error });
      return false;
    }
  }

  /**
   * Execute the agent's main task
   * @returns {Promise<object>}
   */
  async execute() {
    if (this.state !== AGENT_STATE.SPAWNING && this.state !== AGENT_STATE.IDLE) {
      throw new Error(`Cannot execute agent in state: ${this.state}`);
    }

    this.state = AGENT_STATE.RUNNING;
    this.startTime = Date.now();
    this.emit('started', { agentId: this.id, startTime: this.startTime });

    // Set up timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        if (this.state === AGENT_STATE.RUNNING) {
          reject(new Error(`Agent ${this.name} timed out after ${this.timeout}ms`));
        }
      }, this.timeout);
    });

    try {
      // Race between execution and timeout
      const result = await Promise.race([
        this.onExecute(),
        timeoutPromise,
      ]);

      this.results = result;
      this.state = AGENT_STATE.COLLECTING;
      this.emit('executed', { agentId: this.id, result });

      return result;
    } catch (error) {
      this.state = AGENT_STATE.FAILED;
      this.error = error;
      this.endTime = Date.now();
      this.emit('error', { agentId: this.id, error });
      throw error;
    }
  }

  /**
   * Collect and finalize results
   * @returns {Promise<object>}
   */
  async collect() {
    if (this.state !== AGENT_STATE.COLLECTING && this.state !== AGENT_STATE.RUNNING) {
      throw new Error(`Cannot collect from agent in state: ${this.state}`);
    }

    try {
      // Allow subclasses to perform finalization
      const finalResults = await this.onCollect(this.results);

      this.results = finalResults;
      this.state = AGENT_STATE.COMPLETED;
      this.endTime = Date.now();

      this.emit('completed', {
        agentId: this.id,
        results: this.results,
        duration: this.getDuration(),
      });

      return this.results;
    } catch (error) {
      this.state = AGENT_STATE.FAILED;
      this.error = error;
      this.endTime = Date.now();
      this.emit('error', { agentId: this.id, error });
      throw error;
    }
  }

  /**
   * Run full lifecycle: spawn → execute → collect
   * @param {object} input - Input data
   * @returns {Promise<object>}
   */
  async run(input = {}) {
    await this.spawn(input);
    await this.execute();
    return await this.collect();
  }

  /**
   * Cancel the agent
   * @param {string} reason - Cancellation reason
   */
  cancel(reason = 'User cancelled') {
    if (this.state === AGENT_STATE.COMPLETED || this.state === AGENT_STATE.FAILED) {
      return false;
    }

    this.state = AGENT_STATE.CANCELLED;
    this.endTime = Date.now();
    this.error = new Error(reason);

    this.emit('cancelled', { agentId: this.id, reason });
    return true;
  }

  /**
   * Get execution duration in ms
   * @returns {number|null}
   */
  getDuration() {
    if (!this.startTime) return null;
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }

  /**
   * Get agent status summary
   * @returns {object}
   */
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      state: this.state,
      priority: this.priority,
      duration: this.getDuration(),
      hasResults: this.results !== null,
      hasError: this.error !== null,
      error: this.error ? this.error.message : null,
    };
  }

  /**
   * Share context with another agent
   * @param {BaseAgent} targetAgent - Target agent
   * @param {string[]} keys - Keys to share (all if empty)
   */
  shareContext(targetAgent, keys = []) {
    if (!(targetAgent instanceof BaseAgent)) {
      throw new Error('Target must be a BaseAgent instance');
    }

    const contextToShare = keys.length > 0
      ? Object.fromEntries(keys.filter(k => k in this.context).map(k => [k, this.context[k]]))
      : { ...this.context };

    targetAgent.receiveContext(this.id, contextToShare);
  }

  /**
   * Receive shared context from another agent
   * @param {string} sourceAgentId - Source agent ID
   * @param {object} sharedContext - Shared context data
   */
  receiveContext(sourceAgentId, sharedContext) {
    this.context = {
      ...this.context,
      ...sharedContext,
      _sharedFrom: [...(this.context._sharedFrom || []), sourceAgentId],
    };

    this.emit('contextReceived', {
      agentId: this.id,
      sourceAgentId,
      keys: Object.keys(sharedContext),
    });
  }

  // ============ Hooks for subclasses ============

  /**
   * Called during spawn phase
   * Override in subclasses for custom initialization
   * @param {object} input
   */
  async onSpawn(_input) {
    // Default: no-op
  }

  /**
   * Called during execute phase
   * MUST be overridden in subclasses
   * @returns {Promise<object>}
   */
  async onExecute() {
    throw new Error('onExecute must be implemented by subclass');
  }

  /**
   * Called during collect phase
   * Override in subclasses for custom finalization
   * @param {object} results - Raw results from execute
   * @returns {Promise<object>}
   */
  async onCollect(results) {
    return results;
  }
}

module.exports = {
  BaseAgent,
  AGENT_STATE,
  AGENT_PRIORITY,
};
