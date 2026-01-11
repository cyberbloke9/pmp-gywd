/**
 * Context Module
 *
 * Intelligent context prediction and management.
 * The "anticipate" brain - pre-loads what you need before you ask.
 */

const {
  ContextAnalyzer,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_WEIGHTS,
} = require('./context-analyzer');

const {
  ContextPredictor,
  AccessPattern,
  CONFIDENCE,
  CONTEXT_TYPES,
} = require('./context-predictor');

const {
  LRUCache,
  ContextCache,
} = require('./context-cache');

module.exports = {
  // Classes
  ContextAnalyzer,
  ContextPredictor,
  AccessPattern,
  LRUCache,
  ContextCache,

  // Constants
  RELATIONSHIP_TYPES,
  RELATIONSHIP_WEIGHTS,
  CONFIDENCE,
  CONTEXT_TYPES,

  // Factory functions
  createContextPredictor: () => new ContextPredictor(),
  createContextCache: (options) => new ContextCache(options),
  createContextAnalyzer: () => new ContextAnalyzer(),
};
