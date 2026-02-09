'use strict';

/**
 * TF-IDF Vector Embedder
 *
 * Converts text into sparse TF-IDF vectors for similarity comparison.
 * Zero external dependencies — pure JavaScript implementation.
 */

// Stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up', 'that',
  'this', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what',
  'which', 'who', 'whom',
]);

/**
 * Tokenize text into normalized terms
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Compute term frequency for a token list
 * @param {string[]} tokens
 * @returns {Map<string, number>}
 */
function termFrequency(tokens) {
  const tf = new Map();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by total tokens
  const total = tokens.length || 1;
  for (const [term, count] of tf) {
    tf.set(term, count / total);
  }
  return tf;
}

/**
 * TF-IDF Embedder
 *
 * Builds a vocabulary from a corpus of documents and produces
 * sparse TF-IDF vectors for similarity comparison.
 */
class Embedder {
  constructor() {
    /** @type {Map<string, number>} document frequency per term */
    this.df = new Map();
    /** @type {number} total documents seen */
    this.docCount = 0;
    /** @type {string[]} vocabulary (ordered terms) */
    this.vocab = [];
    /** @type {Map<string, number>} term → vocab index */
    this.vocabIndex = new Map();
    this._fitted = false;
  }

  /**
   * Fit the embedder on a corpus
   * @param {string[]} documents - Array of text documents
   * @returns {Embedder} this
   */
  fit(documents) {
    this.df = new Map();
    this.docCount = documents.length;

    for (const doc of documents) {
      const uniqueTerms = new Set(tokenize(doc));
      for (const term of uniqueTerms) {
        this.df.set(term, (this.df.get(term) || 0) + 1);
      }
    }

    // Build vocabulary from all terms
    this.vocab = [...this.df.keys()].sort();
    this.vocabIndex = new Map();
    this.vocab.forEach((term, i) => this.vocabIndex.set(term, i));
    this._fitted = true;

    return this;
  }

  /**
   * Transform a document into a TF-IDF vector
   * @param {string} text
   * @returns {{ vector: number[], terms: string[] }}
   */
  embed(text) {
    if (!this._fitted) {
      throw new Error('Embedder not fitted. Call fit() first.');
    }

    const tokens = tokenize(text);
    const tf = termFrequency(tokens);
    const vector = new Array(this.vocab.length).fill(0);
    const terms = [];

    for (const [term, tfVal] of tf) {
      const idx = this.vocabIndex.get(term);
      if (idx !== undefined) {
        const dfVal = this.df.get(term) || 1;
        const idf = Math.log(this.docCount / dfVal);
        vector[idx] = tfVal * idf;
        terms.push(term);
      }
    }

    return { vector, terms };
  }

  /**
   * Check if the embedder is fitted
   * @returns {boolean}
   */
  isFitted() {
    return this._fitted;
  }

  /**
   * Get vocabulary size
   * @returns {number}
   */
  getVocabSize() {
    return this.vocab.length;
  }

  /**
   * Export embedder state for persistence
   * @returns {object}
   */
  export() {
    return {
      df: Object.fromEntries(this.df),
      docCount: this.docCount,
      vocab: this.vocab,
    };
  }

  /**
   * Import embedder state
   * @param {object} state
   * @returns {Embedder}
   */
  import(state) {
    this.df = new Map(Object.entries(state.df));
    this.docCount = state.docCount;
    this.vocab = state.vocab;
    this.vocabIndex = new Map();
    this.vocab.forEach((term, i) => this.vocabIndex.set(term, i));
    this._fitted = true;
    return this;
  }
}

/**
 * Compute cosine similarity between two vectors
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number} Similarity 0-1
 */
function cosineSimilarity(a, b) {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

module.exports = {
  Embedder,
  cosineSimilarity,
  tokenize,
  termFrequency,
  STOP_WORDS,
};
