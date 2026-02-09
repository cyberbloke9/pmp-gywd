'use strict';

const { Embedder, cosineSimilarity } = require('./embedder');

/**
 * Semantic Search Engine
 *
 * Indexes documents with TF-IDF embeddings and supports
 * similarity-based search with filtering and ranking.
 */
class SemanticSearch {
  constructor() {
    this.embedder = new Embedder();
    /** @type {Array<{ id: string, text: string, type: string, metadata: object, vector: number[] }>} */
    this.index = [];
    this._indexed = false;
  }

  /**
   * Index a collection of documents
   * @param {Array<{ id: string, text: string, type: string, metadata?: object }>} documents
   * @returns {SemanticSearch} this
   */
  buildIndex(documents) {
    // Fit embedder on all document texts
    const texts = documents.map(d => d.text);
    this.embedder.fit(texts);

    // Embed each document
    this.index = documents.map(doc => {
      const { vector } = this.embedder.embed(doc.text);
      return {
        id: doc.id,
        text: doc.text,
        type: doc.type,
        metadata: doc.metadata || {},
        vector,
      };
    });

    this._indexed = true;
    return this;
  }

  /**
   * Search for documents similar to query
   * @param {string} query - Search query text
   * @param {object} [options]
   * @param {number} [options.limit=10] - Max results
   * @param {number} [options.minScore=0.01] - Minimum similarity score
   * @param {string} [options.type] - Filter by document type
   * @returns {Array<{ id: string, text: string, type: string, metadata: object, score: number }>}
   */
  search(query, options = {}) {
    if (!this._indexed) {
      throw new Error('Index not built. Call buildIndex() first.');
    }

    const { limit = 10, minScore = 0.01, type } = options;
    const { vector: queryVector } = this.embedder.embed(query);

    let candidates = this.index;
    if (type) {
      candidates = candidates.filter(doc => doc.type === type);
    }

    const results = candidates
      .map(doc => ({
        id: doc.id,
        text: doc.text,
        type: doc.type,
        metadata: doc.metadata,
        score: cosineSimilarity(queryVector, doc.vector),
      }))
      .filter(r => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return results;
  }

  /**
   * Find documents similar to a given document by ID
   * @param {string} docId
   * @param {number} [limit=5]
   * @returns {Array<{ id: string, text: string, type: string, score: number }>}
   */
  findSimilar(docId, limit = 5) {
    if (!this._indexed) {
      throw new Error('Index not built. Call buildIndex() first.');
    }

    const doc = this.index.find(d => d.id === docId);
    if (!doc) return [];

    return this.index
      .filter(d => d.id !== docId)
      .map(d => ({
        id: d.id,
        text: d.text,
        type: d.type,
        score: cosineSimilarity(doc.vector, d.vector),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Check if index is built
   * @returns {boolean}
   */
  isIndexed() {
    return this._indexed;
  }

  /**
   * Get index size
   * @returns {number}
   */
  getIndexSize() {
    return this.index.length;
  }

  /**
   * Get vocabulary size
   * @returns {number}
   */
  getVocabSize() {
    return this.embedder.getVocabSize();
  }

  /**
   * Export index state
   * @returns {object}
   */
  export() {
    return {
      embedder: this.embedder.export(),
      index: this.index.map(d => ({
        id: d.id,
        text: d.text,
        type: d.type,
        metadata: d.metadata,
      })),
    };
  }
}

module.exports = { SemanticSearch };
