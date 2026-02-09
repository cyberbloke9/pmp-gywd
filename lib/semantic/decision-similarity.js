'use strict';

const { Embedder, cosineSimilarity } = require('./embedder');

/**
 * Decision Similarity Detector
 *
 * Compares a proposed decision against historical decisions
 * to find similar past choices and their outcomes.
 */
class DecisionSimilarity {
  constructor() {
    this.embedder = new Embedder();
    /** @type {Array<{ id: string, text: string, decision: string, rationale: string, vector: number[] }>} */
    this.decisions = [];
    this._ready = false;
  }

  /**
   * Load decisions from an array
   * @param {Array<{ id: string, decision: string, rationale: string, outcome?: string }>} decisions
   * @returns {DecisionSimilarity} this
   */
  loadDecisions(decisions) {
    if (decisions.length === 0) {
      this._ready = true;
      return this;
    }

    const texts = decisions.map(d => `${d.decision}. ${d.rationale}. ${d.outcome || ''}`);
    this.embedder.fit(texts);

    this.decisions = decisions.map((d, i) => {
      const { vector } = this.embedder.embed(texts[i]);
      return {
        id: d.id,
        text: texts[i],
        decision: d.decision,
        rationale: d.rationale,
        outcome: d.outcome || null,
        vector,
      };
    });

    this._ready = true;
    return this;
  }

  /**
   * Find decisions similar to a proposed one
   * @param {string} proposedDecision - The decision being considered
   * @param {string} [rationale=''] - Why this decision is being considered
   * @param {object} [options]
   * @param {number} [options.limit=5] - Max results
   * @param {number} [options.minScore=0.05] - Minimum similarity
   * @returns {Array<{ id: string, decision: string, rationale: string, outcome: string|null, score: number }>}
   */
  findSimilar(proposedDecision, rationale = '', options = {}) {
    if (!this._ready || this.decisions.length === 0) {
      return [];
    }

    const { limit = 5, minScore = 0.05 } = options;
    const queryText = `${proposedDecision}. ${rationale}`;
    const { vector: queryVector } = this.embedder.embed(queryText);

    return this.decisions
      .map(d => ({
        id: d.id,
        decision: d.decision,
        rationale: d.rationale,
        outcome: d.outcome,
        score: cosineSimilarity(queryVector, d.vector),
      }))
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Check if a decision might conflict with existing ones
   * @param {string} proposedDecision
   * @param {number} [threshold=0.8] - Similarity threshold for "conflict"
   * @returns {{ hasConflict: boolean, similar: Array }}
   */
  checkConflict(proposedDecision, threshold = 0.8) {
    const similar = this.findSimilar(proposedDecision, '', { limit: 3, minScore: threshold });
    return {
      hasConflict: similar.length > 0,
      similar,
    };
  }

  /**
   * Check if ready
   * @returns {boolean}
   */
  isReady() {
    return this._ready;
  }

  /**
   * Get decision count
   * @returns {number}
   */
  getDecisionCount() {
    return this.decisions.length;
  }
}

module.exports = { DecisionSimilarity };
