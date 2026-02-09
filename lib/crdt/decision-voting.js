'use strict';

const { PNCounter, LWWRegister } = require('./base-crdt');

/**
 * Decision Voting System
 *
 * Enables team consensus on decisions through CRDT-backed voting.
 * Each decision can have multiple options. Team members vote,
 * and results are tallied with quorum and majority checks.
 */
class DecisionVoting {
  /**
   * @param {string} nodeId - This voter's unique identifier
   */
  constructor(nodeId) {
    this.nodeId = nodeId;
    /** @type {Map<string, Decision>} */
    this.decisions = new Map();
  }

  /**
   * Create a new decision for voting
   * @param {object} params
   * @param {string} params.id - Decision ID
   * @param {string} params.title - Decision title
   * @param {string} params.description - Decision description
   * @param {string[]} params.options - Available options to vote on
   * @param {number} [params.quorum=2] - Minimum votes required
   * @param {string} [params.strategy='majority'] - 'majority' | 'unanimous' | 'plurality'
   * @returns {Decision}
   */
  createDecision({ id, title, description, options, quorum = 2, strategy = 'majority' }) {
    if (this.decisions.has(id)) {
      throw new Error(`Decision ${id} already exists`);
    }
    if (!options || options.length < 2) {
      throw new Error('Decision must have at least 2 options');
    }

    const decision = {
      id,
      title: new LWWRegister(this.nodeId, title),
      description: new LWWRegister(this.nodeId, description),
      status: new LWWRegister(this.nodeId, 'open'),
      options,
      /** @type {Map<string, PNCounter>} option → vote counter */
      votes: new Map(),
      /** @type {Map<string, string>} voterId → chosen option */
      voterChoices: new Map(),
      quorum,
      strategy,
      createdBy: this.nodeId,
      createdAt: Date.now(),
    };

    // Initialize vote counters for each option
    for (const option of options) {
      decision.votes.set(option, new PNCounter(this.nodeId));
    }

    this.decisions.set(id, decision);
    return decision;
  }

  /**
   * Cast a vote on a decision
   * @param {string} decisionId
   * @param {string} option - The option to vote for
   * @param {string} [voterId] - Override voter ID (defaults to this.nodeId)
   * @returns {{ success: boolean, message: string }}
   */
  vote(decisionId, option, voterId) {
    const vid = voterId || this.nodeId;
    const decision = this.decisions.get(decisionId);
    if (!decision) {
      return { success: false, message: 'Decision not found' };
    }
    if (decision.status.value() !== 'open') {
      return { success: false, message: 'Decision is not open for voting' };
    }
    if (!decision.options.includes(option)) {
      return { success: false, message: `Invalid option: ${option}` };
    }

    // If voter already voted, retract previous vote
    const previousChoice = decision.voterChoices.get(vid);
    if (previousChoice) {
      const prevCounter = decision.votes.get(previousChoice);
      if (prevCounter) prevCounter.decrement();
    }

    // Cast new vote
    const counter = decision.votes.get(option);
    counter.increment();
    decision.voterChoices.set(vid, option);

    return { success: true, message: `Vote cast for "${option}"` };
  }

  /**
   * Get current tally for a decision
   * @param {string} decisionId
   * @returns {{ options: Record<string, number>, totalVotes: number, leading: string|null, hasQuorum: boolean } | null}
   */
  getTally(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    const options = {};
    let totalVotes = 0;
    let maxVotes = 0;
    let leading = null;

    for (const [option, counter] of decision.votes) {
      const count = Math.max(0, counter.value());
      options[option] = count;
      totalVotes += count;
      if (count > maxVotes) {
        maxVotes = count;
        leading = option;
      }
    }

    return {
      options,
      totalVotes,
      leading,
      hasQuorum: totalVotes >= decision.quorum,
    };
  }

  /**
   * Resolve a decision based on votes and strategy
   * @param {string} decisionId
   * @returns {{ resolved: boolean, winner: string|null, reason: string }}
   */
  resolve(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (!decision) return { resolved: false, winner: null, reason: 'Decision not found' };
    if (decision.status.value() !== 'open') {
      return { resolved: false, winner: null, reason: 'Decision already resolved' };
    }

    const tally = this.getTally(decisionId);
    if (!tally.hasQuorum) {
      return { resolved: false, winner: null, reason: `Quorum not met (${tally.totalVotes}/${decision.quorum})` };
    }

    let winner = null;
    let reason = '';

    switch (decision.strategy) {
      case 'majority': {
        // >50% of votes
        const threshold = tally.totalVotes / 2;
        const topVotes = tally.options[tally.leading];
        if (topVotes > threshold) {
          winner = tally.leading;
          reason = `Majority: ${topVotes}/${tally.totalVotes} votes`;
        } else {
          reason = `No majority: ${tally.leading} has ${topVotes}/${tally.totalVotes}`;
        }
        break;
      }
      case 'unanimous': {
        // All votes must be for the same option
        const topVotes = tally.options[tally.leading];
        if (topVotes === tally.totalVotes) {
          winner = tally.leading;
          reason = `Unanimous: ${topVotes} votes`;
        } else {
          reason = 'Not unanimous';
        }
        break;
      }
      case 'plurality': {
        // Most votes wins (no majority needed)
        winner = tally.leading;
        reason = `Plurality: ${tally.options[tally.leading]} votes`;
        break;
      }
      default:
        reason = `Unknown strategy: ${decision.strategy}`;
    }

    if (winner) {
      decision.status.set('resolved');
    }

    return { resolved: winner !== null, winner, reason };
  }

  /**
   * Close a decision without resolving
   * @param {string} decisionId
   */
  closeDecision(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (decision) {
      decision.status.set('closed');
    }
  }

  /**
   * Get a decision's full state
   * @param {string} decisionId
   * @returns {object|null}
   */
  getDecision(decisionId) {
    const decision = this.decisions.get(decisionId);
    if (!decision) return null;

    const tally = this.getTally(decisionId);
    return {
      id: decision.id,
      title: decision.title.value(),
      description: decision.description.value(),
      status: decision.status.value(),
      options: decision.options,
      tally,
      quorum: decision.quorum,
      strategy: decision.strategy,
      createdBy: decision.createdBy,
      createdAt: decision.createdAt,
      voterCount: decision.voterChoices.size,
    };
  }

  /**
   * List all decisions
   * @param {string} [status] - Filter by status
   * @returns {Array}
   */
  listDecisions(status) {
    const results = [];
    for (const [id] of this.decisions) {
      const info = this.getDecision(id);
      if (!status || info.status === status) {
        results.push(info);
      }
    }
    return results;
  }

  /**
   * Merge with another DecisionVoting instance
   * @param {DecisionVoting} other
   */
  merge(other) {
    for (const [id, otherDecision] of other.decisions) {
      if (!this.decisions.has(id)) {
        // Import the entire decision
        this.decisions.set(id, otherDecision);
      } else {
        const local = this.decisions.get(id);
        // Merge LWW fields
        local.title.merge(otherDecision.title);
        local.description.merge(otherDecision.description);
        local.status.merge(otherDecision.status);
        // Merge vote counters
        for (const [option, otherCounter] of otherDecision.votes) {
          if (local.votes.has(option)) {
            local.votes.get(option).merge(otherCounter);
          }
        }
        // Merge voter choices (LWW per voter)
        for (const [voter, choice] of otherDecision.voterChoices) {
          local.voterChoices.set(voter, choice);
        }
      }
    }
  }

  /**
   * Get decision count
   * @returns {number}
   */
  getDecisionCount() {
    return this.decisions.size;
  }
}

module.exports = { DecisionVoting };
