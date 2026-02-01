'use strict';

/**
 * GYWD Agents
 *
 * Executable agent framework for autonomous intelligence.
 */

const { BaseAgent, AGENT_STATE, AGENT_PRIORITY } = require('./base-agent');
const {
  CriticAgent,
  DevilsAdvocateAgent,
  RedTeamAgent,
  ChaosAgent,
  SkepticAgent,
} = require('./agent-types');
const {
  AgentOrchestrator,
  ORCHESTRATION_STRATEGY,
  AGGREGATION_STRATEGY,
} = require('./agent-orchestrator');

module.exports = {
  // Base
  BaseAgent,
  AGENT_STATE,
  AGENT_PRIORITY,

  // Agent Types
  CriticAgent,
  DevilsAdvocateAgent,
  RedTeamAgent,
  ChaosAgent,
  SkepticAgent,

  // Orchestration
  AgentOrchestrator,
  ORCHESTRATION_STRATEGY,
  AGGREGATION_STRATEGY,
};
