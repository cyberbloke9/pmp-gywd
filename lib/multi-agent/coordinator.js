'use strict';

/**
 * Multi-Agent Coordinator
 *
 * Manages coordination between multiple agents with shared state and conflict resolution.
 * Part of Phase 33: Multi-Agent Core.
 */

const { EventEmitter } = require('events');

/**
 * Coordination modes
 */
const COORDINATION_MODE = {
  CONSENSUS: 'consensus',       // All agents must agree
  MAJORITY: 'majority',         // Majority vote wins
  LEADER: 'leader',             // Single leader decides
  ROUND_ROBIN: 'round_robin',   // Take turns leading
};

/**
 * Agent roles
 */
const AGENT_ROLE = {
  LEADER: 'leader',
  FOLLOWER: 'follower',
  OBSERVER: 'observer',
  ARBITRATOR: 'arbitrator',
};

/**
 * Multi-Agent Coordinator
 */
class MultiAgentCoordinator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.mode = options.mode || COORDINATION_MODE.CONSENSUS;
    this.agents = new Map();
    this.sharedState = {};
    this.stateLock = false;
    this.pendingProposals = [];
    this.decisionHistory = [];
    this.currentLeader = null;
  }

  /**
   * Register an agent with the coordinator
   * @param {string} agentId
   * @param {object} config
   */
  registerAgent(agentId, config = {}) {
    this.agents.set(agentId, {
      id: agentId,
      role: config.role || AGENT_ROLE.FOLLOWER,
      priority: config.priority || 1,
      capabilities: config.capabilities || [],
      state: 'active',
      lastSeen: Date.now(),
    });

    if (config.role === AGENT_ROLE.LEADER) {
      this.currentLeader = agentId;
    }

    this.emit('agentRegistered', { agentId, role: config.role });
  }

  /**
   * Unregister an agent
   * @param {string} agentId
   */
  unregisterAgent(agentId) {
    this.agents.delete(agentId);

    if (this.currentLeader === agentId) {
      this._electNewLeader();
    }

    this.emit('agentUnregistered', { agentId });
  }

  /**
   * Propose a state change
   * @param {string} agentId - Proposing agent
   * @param {object} proposal - State change proposal
   * @returns {Promise<object>}
   */
  async proposeChange(agentId, proposal) {
    if (!this.agents.has(agentId)) {
      throw new Error(`Unknown agent: ${agentId}`);
    }

    const proposalRecord = {
      id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      proposal,
      timestamp: Date.now(),
      votes: new Map(),
      status: 'pending',
    };

    this.pendingProposals.push(proposalRecord);
    this.emit('proposalCreated', proposalRecord);

    // Process based on coordination mode
    const result = await this._processProposal(proposalRecord);

    return result;
  }

  /**
   * Process a proposal based on coordination mode
   * @param {object} proposalRecord
   * @returns {Promise<object>}
   */
  async _processProposal(proposalRecord) {
    switch (this.mode) {
      case COORDINATION_MODE.CONSENSUS:
        return this._processConsensus(proposalRecord);
      case COORDINATION_MODE.MAJORITY:
        return this._processMajority(proposalRecord);
      case COORDINATION_MODE.LEADER:
        return this._processLeaderDecision(proposalRecord);
      case COORDINATION_MODE.ROUND_ROBIN:
        return this._processRoundRobin(proposalRecord);
      default:
        return this._processMajority(proposalRecord);
    }
  }

  /**
   * Process consensus decision
   * @param {object} proposalRecord
   * @returns {Promise<object>}
   */
  async _processConsensus(proposalRecord) {
    // Request votes from all agents
    const agents = Array.from(this.agents.values()).filter(a => a.state === 'active');

    for (const agent of agents) {
      // Simulate agent voting (in real system, would query agents)
      const vote = await this._requestVote(agent.id, proposalRecord);
      proposalRecord.votes.set(agent.id, vote);
    }

    // Check if all agents approve
    const allApprove = Array.from(proposalRecord.votes.values()).every(v => v.approve);

    if (allApprove) {
      proposalRecord.status = 'approved';
      await this._applyProposal(proposalRecord);
    } else {
      proposalRecord.status = 'rejected';
    }

    this._recordDecision(proposalRecord);
    return this._getProposalResult(proposalRecord);
  }

  /**
   * Process majority decision
   * @param {object} proposalRecord
   * @returns {Promise<object>}
   */
  async _processMajority(proposalRecord) {
    const agents = Array.from(this.agents.values()).filter(a => a.state === 'active');

    for (const agent of agents) {
      const vote = await this._requestVote(agent.id, proposalRecord);
      proposalRecord.votes.set(agent.id, vote);
    }

    const approvals = Array.from(proposalRecord.votes.values()).filter(v => v.approve).length;
    const majority = Math.floor(agents.length / 2) + 1;

    if (approvals >= majority) {
      proposalRecord.status = 'approved';
      await this._applyProposal(proposalRecord);
    } else {
      proposalRecord.status = 'rejected';
    }

    this._recordDecision(proposalRecord);
    return this._getProposalResult(proposalRecord);
  }

  /**
   * Process leader decision
   * @param {object} proposalRecord
   * @returns {Promise<object>}
   */
  async _processLeaderDecision(proposalRecord) {
    if (!this.currentLeader) {
      this._electNewLeader();
    }

    if (!this.currentLeader) {
      proposalRecord.status = 'rejected';
      proposalRecord.reason = 'No leader available';
    } else {
      const vote = await this._requestVote(this.currentLeader, proposalRecord);
      proposalRecord.votes.set(this.currentLeader, vote);

      if (vote.approve) {
        proposalRecord.status = 'approved';
        await this._applyProposal(proposalRecord);
      } else {
        proposalRecord.status = 'rejected';
      }
    }

    this._recordDecision(proposalRecord);
    return this._getProposalResult(proposalRecord);
  }

  /**
   * Process round-robin decision
   * @param {object} proposalRecord
   * @returns {Promise<object>}
   */
  async _processRoundRobin(proposalRecord) {
    // Rotate to next leader
    this._rotateLeader();
    return this._processLeaderDecision(proposalRecord);
  }

  /**
   * Request vote from an agent
   * @param {string} agentId
   * @param {object} proposalRecord
   * @returns {Promise<object>}
   */
  async _requestVote(agentId, proposalRecord) {
    // Simulated voting logic - in real system, would communicate with agent
    const agent = this.agents.get(agentId);

    // Default approval logic based on role
    let approve = true;

    if (agent.role === AGENT_ROLE.OBSERVER) {
      // Observers abstain
      return { approve: true, abstain: true };
    }

    // Check for conflicts
    if (this._hasConflict(proposalRecord.proposal)) {
      approve = false;
    }

    return {
      approve,
      agentId,
      timestamp: Date.now(),
      reason: approve ? 'No conflicts detected' : 'Potential conflict detected',
    };
  }

  /**
   * Check for state conflicts
   * @param {object} proposal
   * @returns {boolean}
   */
  _hasConflict(proposal) {
    // Check if proposal conflicts with current state
    if (proposal.key && this.sharedState[proposal.key] !== undefined) {
      if (proposal.expectedValue !== undefined &&
          this.sharedState[proposal.key] !== proposal.expectedValue) {
        return true;
      }
    }
    return false;
  }

  /**
   * Apply approved proposal
   * @param {object} proposalRecord
   */
  async _applyProposal(proposalRecord) {
    const { proposal } = proposalRecord;

    if (proposal.type === 'set') {
      this.sharedState[proposal.key] = proposal.value;
    } else if (proposal.type === 'delete') {
      delete this.sharedState[proposal.key];
    } else if (proposal.type === 'merge') {
      this.sharedState = { ...this.sharedState, ...proposal.value };
    }

    this.emit('stateChanged', {
      proposalId: proposalRecord.id,
      change: proposal,
    });
  }

  /**
   * Elect a new leader
   */
  _electNewLeader() {
    const candidates = Array.from(this.agents.values())
      .filter(a => a.state === 'active' && a.role !== AGENT_ROLE.OBSERVER)
      .sort((a, b) => b.priority - a.priority);

    if (candidates.length > 0) {
      this.currentLeader = candidates[0].id;
      this.agents.get(this.currentLeader).role = AGENT_ROLE.LEADER;
      this.emit('leaderElected', { leaderId: this.currentLeader });
    } else {
      this.currentLeader = null;
    }
  }

  /**
   * Rotate leader in round-robin
   */
  _rotateLeader() {
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.state === 'active' && a.role !== AGENT_ROLE.OBSERVER);

    if (activeAgents.length === 0) return;

    const currentIndex = activeAgents.findIndex(a => a.id === this.currentLeader);
    const nextIndex = (currentIndex + 1) % activeAgents.length;

    if (this.currentLeader) {
      this.agents.get(this.currentLeader).role = AGENT_ROLE.FOLLOWER;
    }

    this.currentLeader = activeAgents[nextIndex].id;
    this.agents.get(this.currentLeader).role = AGENT_ROLE.LEADER;

    this.emit('leaderRotated', { newLeaderId: this.currentLeader });
  }

  /**
   * Record decision in history
   * @param {object} proposalRecord
   */
  _recordDecision(proposalRecord) {
    this.decisionHistory.push({
      proposalId: proposalRecord.id,
      status: proposalRecord.status,
      timestamp: Date.now(),
      votes: Object.fromEntries(proposalRecord.votes),
    });

    // Keep history bounded
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-100);
    }
  }

  /**
   * Get proposal result
   * @param {object} proposalRecord
   * @returns {object}
   */
  _getProposalResult(proposalRecord) {
    return {
      proposalId: proposalRecord.id,
      status: proposalRecord.status,
      approved: proposalRecord.status === 'approved',
      votes: Object.fromEntries(proposalRecord.votes),
      reason: proposalRecord.reason,
    };
  }

  /**
   * Get shared state
   * @param {string} key - Optional key to get specific value
   * @returns {object|any}
   */
  getState(key = null) {
    if (key) {
      return this.sharedState[key];
    }
    return { ...this.sharedState };
  }

  /**
   * Get coordinator status
   * @returns {object}
   */
  getStatus() {
    return {
      mode: this.mode,
      agentCount: this.agents.size,
      activeAgents: Array.from(this.agents.values()).filter(a => a.state === 'active').length,
      currentLeader: this.currentLeader,
      pendingProposals: this.pendingProposals.filter(p => p.status === 'pending').length,
      decisionsCount: this.decisionHistory.length,
    };
  }
}

module.exports = {
  MultiAgentCoordinator,
  COORDINATION_MODE,
  AGENT_ROLE,
};
