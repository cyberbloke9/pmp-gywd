'use strict';

/**
 * Agent Orchestrator
 *
 * Manages multiple agents, handles context sharing, and aggregates results.
 * Part of Phase 29: Agent Runtime.
 */

const { EventEmitter } = require('events');
const { AGENT_STATE, AGENT_PRIORITY } = require('./base-agent');

/**
 * Orchestration strategies
 */
const ORCHESTRATION_STRATEGY = {
  SEQUENTIAL: 'sequential',     // Run agents one after another
  PARALLEL: 'parallel',         // Run all agents simultaneously
  PRIORITY: 'priority',         // Run by priority, highest first
  PIPELINE: 'pipeline',         // Each agent's output feeds next agent's input
};

/**
 * Result aggregation strategies
 */
const AGGREGATION_STRATEGY = {
  MERGE: 'merge',               // Merge all results into one object
  ARRAY: 'array',               // Collect results as array
  VOTE: 'vote',                 // Majority voting on common fields
  WEIGHTED: 'weighted',         // Weight results by agent priority
};

/**
 * Agent Orchestrator class
 */
class AgentOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.agents = new Map();
    this.strategy = options.strategy || ORCHESTRATION_STRATEGY.PARALLEL;
    this.aggregation = options.aggregation || AGGREGATION_STRATEGY.MERGE;
    this.timeout = options.timeout || 60000;
    this.maxConcurrent = options.maxConcurrent || 5;

    this.results = new Map();
    this.sharedContext = {};
    this.isRunning = false;
  }

  /**
   * Register an agent with the orchestrator
   * @param {BaseAgent} agent - Agent to register
   * @returns {string} Agent ID
   */
  register(agent) {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already registered`);
    }

    this.agents.set(agent.id, agent);

    // Set up event forwarding
    agent.on('spawned', (data) => this.emit('agentSpawned', data));
    agent.on('started', (data) => this.emit('agentStarted', data));
    agent.on('completed', (data) => this.emit('agentCompleted', data));
    agent.on('error', (data) => this.emit('agentError', data));

    this.emit('agentRegistered', { agentId: agent.id, name: agent.name });
    return agent.id;
  }

  /**
   * Unregister an agent
   * @param {string} agentId - Agent ID to unregister
   */
  unregister(agentId) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.removeAllListeners();
      this.agents.delete(agentId);
      this.emit('agentUnregistered', { agentId });
    }
  }

  /**
   * Set shared context for all agents
   * @param {object} context - Context to share
   */
  setSharedContext(context) {
    this.sharedContext = { ...this.sharedContext, ...context };
    this.emit('contextUpdated', { keys: Object.keys(context) });
  }

  /**
   * Run all registered agents
   * @param {object} input - Input to pass to all agents
   * @returns {Promise<object>}
   */
  async runAll(input = {}) {
    if (this.isRunning) {
      throw new Error('Orchestrator is already running');
    }

    this.isRunning = true;
    this.results.clear();

    const combinedInput = { ...this.sharedContext, ...input };

    this.emit('started', {
      agentCount: this.agents.size,
      strategy: this.strategy,
    });

    try {
      let results;

      switch (this.strategy) {
        case ORCHESTRATION_STRATEGY.SEQUENTIAL:
          results = await this._runSequential(combinedInput);
          break;
        case ORCHESTRATION_STRATEGY.PARALLEL:
          results = await this._runParallel(combinedInput);
          break;
        case ORCHESTRATION_STRATEGY.PRIORITY:
          results = await this._runByPriority(combinedInput);
          break;
        case ORCHESTRATION_STRATEGY.PIPELINE:
          results = await this._runPipeline(combinedInput);
          break;
        default:
          results = await this._runParallel(combinedInput);
      }

      const aggregated = this._aggregateResults(results);

      this.emit('completed', {
        agentCount: this.agents.size,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
      });

      return aggregated;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run agents sequentially
   * @param {object} input
   * @returns {Promise<Array>}
   */
  async _runSequential(input) {
    const results = [];

    for (const [agentId, agent] of this.agents) {
      try {
        const result = await agent.run(input);
        results.push({ agentId, success: true, result });
        this.results.set(agentId, result);
      } catch (error) {
        results.push({ agentId, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Run agents in parallel
   * @param {object} input
   * @returns {Promise<Array>}
   */
  async _runParallel(input) {
    const agentArray = Array.from(this.agents.entries());
    const results = [];

    // Run in batches to respect maxConcurrent
    for (let i = 0; i < agentArray.length; i += this.maxConcurrent) {
      const batch = agentArray.slice(i, i + this.maxConcurrent);

      const batchResults = await Promise.allSettled(
        batch.map(async ([agentId, agent]) => {
          const result = await agent.run(input);
          this.results.set(agentId, result);
          return { agentId, result };
        })
      );

      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled') {
          results.push({
            agentId: settledResult.value.agentId,
            success: true,
            result: settledResult.value.result,
          });
        } else {
          results.push({
            agentId: 'unknown',
            success: false,
            error: settledResult.reason.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * Run agents by priority (highest first)
   * @param {object} input
   * @returns {Promise<Array>}
   */
  async _runByPriority(input) {
    const sortedAgents = Array.from(this.agents.entries())
      .sort(([, a], [, b]) => a.priority - b.priority);

    const results = [];

    for (const [agentId, agent] of sortedAgents) {
      try {
        const result = await agent.run(input);
        results.push({ agentId, success: true, result, priority: agent.priority });
        this.results.set(agentId, result);
      } catch (error) {
        results.push({ agentId, success: false, error: error.message, priority: agent.priority });
      }
    }

    return results;
  }

  /**
   * Run agents in pipeline (output → input)
   * @param {object} input
   * @returns {Promise<Array>}
   */
  async _runPipeline(input) {
    const results = [];
    let currentInput = { ...input };

    for (const [agentId, agent] of this.agents) {
      try {
        const result = await agent.run(currentInput);
        results.push({ agentId, success: true, result });
        this.results.set(agentId, result);

        // Pass result as input to next agent
        currentInput = { ...currentInput, previousResult: result };
      } catch (error) {
        results.push({ agentId, success: false, error: error.message });
        // Stop pipeline on failure
        break;
      }
    }

    return results;
  }

  /**
   * Aggregate results based on strategy
   * @param {Array} results
   * @returns {object}
   */
  _aggregateResults(results) {
    const successfulResults = results.filter(r => r.success);

    switch (this.aggregation) {
      case AGGREGATION_STRATEGY.MERGE:
        return this._mergeResults(successfulResults);
      case AGGREGATION_STRATEGY.ARRAY:
        return this._arrayResults(successfulResults);
      case AGGREGATION_STRATEGY.VOTE:
        return this._voteResults(successfulResults);
      case AGGREGATION_STRATEGY.WEIGHTED:
        return this._weightedResults(successfulResults);
      default:
        return this._mergeResults(successfulResults);
    }
  }

  /**
   * Merge all results into single object
   * @param {Array} results
   * @returns {object}
   */
  _mergeResults(results) {
    const merged = {
      _meta: {
        agentCount: results.length,
        strategy: this.aggregation,
        timestamp: new Date().toISOString(),
      },
    };

    for (const { agentId, result } of results) {
      const agent = this.agents.get(agentId);
      const key = agent ? agent.type : agentId;
      merged[key] = result;
    }

    return merged;
  }

  /**
   * Collect results as array
   * @param {Array} results
   * @returns {object}
   */
  _arrayResults(results) {
    return {
      _meta: {
        agentCount: results.length,
        strategy: this.aggregation,
        timestamp: new Date().toISOString(),
      },
      results: results.map(({ agentId, result }) => {
        const agent = this.agents.get(agentId);
        return {
          agent: agent ? agent.name : agentId,
          type: agent ? agent.type : 'unknown',
          result,
        };
      }),
    };
  }

  /**
   * Majority voting on common fields
   * @param {Array} results
   * @returns {object}
   */
  _voteResults(results) {
    const votes = {};
    const finalResult = {};

    // Collect votes for each field
    for (const { result } of results) {
      if (typeof result === 'object' && result !== null) {
        for (const [key, value] of Object.entries(result)) {
          if (!votes[key]) votes[key] = new Map();

          const valueKey = JSON.stringify(value);
          const currentCount = votes[key].get(valueKey) || 0;
          votes[key].set(valueKey, currentCount + 1);
        }
      }
    }

    // Select majority for each field
    for (const [key, valueMap] of Object.entries(votes)) {
      let maxCount = 0;
      let winner = null;

      for (const [valueKey, count] of valueMap.entries()) {
        if (count > maxCount) {
          maxCount = count;
          winner = JSON.parse(valueKey);
        }
      }

      finalResult[key] = winner;
    }

    return {
      _meta: {
        agentCount: results.length,
        strategy: this.aggregation,
        timestamp: new Date().toISOString(),
      },
      ...finalResult,
    };
  }

  /**
   * Weight results by agent priority
   * @param {Array} results
   * @returns {object}
   */
  _weightedResults(results) {
    const weighted = {
      _meta: {
        agentCount: results.length,
        strategy: this.aggregation,
        timestamp: new Date().toISOString(),
      },
      byPriority: {},
    };

    // Group by priority
    for (const { agentId, result } of results) {
      const agent = this.agents.get(agentId);
      const priority = agent ? agent.priority : AGENT_PRIORITY.NORMAL;
      const priorityKey = `priority_${priority}`;

      if (!weighted.byPriority[priorityKey]) {
        weighted.byPriority[priorityKey] = [];
      }

      weighted.byPriority[priorityKey].push({
        agent: agent ? agent.name : agentId,
        result,
      });
    }

    return weighted;
  }

  /**
   * Get status of all agents
   * @returns {Array}
   */
  getStatus() {
    return Array.from(this.agents.values()).map(agent => agent.getStatus());
  }

  /**
   * Cancel all running agents
   * @param {string} reason
   */
  cancelAll(reason = 'Orchestrator cancelled') {
    for (const agent of this.agents.values()) {
      if (agent.state === AGENT_STATE.RUNNING || agent.state === AGENT_STATE.SPAWNING) {
        agent.cancel(reason);
      }
    }

    this.isRunning = false;
    this.emit('cancelled', { reason });
  }

  /**
   * Clear all agents and results
   */
  clear() {
    this.cancelAll('Clearing orchestrator');
    this.agents.clear();
    this.results.clear();
    this.sharedContext = {};
  }
}

module.exports = {
  AgentOrchestrator,
  ORCHESTRATION_STRATEGY,
  AGGREGATION_STRATEGY,
};
