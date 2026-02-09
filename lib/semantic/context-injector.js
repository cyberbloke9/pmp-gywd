'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { SemanticSearch } = require('./search');

/**
 * Get the global GYWD directory path (lazy for testability)
 * @returns {string}
 */
function getGlobalDir() {
  return path.join(os.homedir(), '.gywd', 'global');
}

/**
 * Auto-Context Injector
 *
 * Given a task description, automatically surfaces relevant past
 * patterns, expertise, and decisions to provide context.
 */
class ContextInjector {
  constructor() {
    this.search = new SemanticSearch();
    this._ready = false;
  }

  /**
   * Load and index all GYWD data for context injection
   * @returns {ContextInjector} this
   */
  load() {
    const documents = [];

    const globalDir = getGlobalDir();

    // Load patterns
    const patterns = this._loadJson(path.join(globalDir, 'patterns.json'), []);
    for (const p of patterns) {
      documents.push({
        id: `pattern:${p.id || documents.length}`,
        text: `${p.type} pattern: ${p.pattern}. Confidence ${p.confidence}. Seen ${p.occurrences} times.`,
        type: 'pattern',
        metadata: { confidence: p.confidence, occurrences: p.occurrences, patternType: p.type },
      });
    }

    // Load expertise
    const expertise = this._loadJson(path.join(globalDir, 'expertise.json'), {});
    for (const [domain, data] of Object.entries(expertise)) {
      documents.push({
        id: `expertise:${domain}`,
        text: `Expertise in ${domain} at level ${data.level} with ${data.observations} observations.`,
        type: 'expertise',
        metadata: { domain, level: data.level },
      });
    }

    // Load projects
    const projects = this._loadJson(path.join(globalDir, 'projects.json'), []);
    for (const proj of projects) {
      const langs = proj.metadata?.languages?.join(', ') || 'unknown';
      documents.push({
        id: `project:${proj.name || proj.path}`,
        text: `Project ${proj.name} at ${proj.path}. Languages: ${langs}. Accessed ${proj.accessCount} times.`,
        type: 'project',
        metadata: { name: proj.name, path: proj.path },
      });
    }

    if (documents.length > 0) {
      this.search.buildIndex(documents);
    }
    this._ready = true;
    return this;
  }

  /**
   * Get relevant context for a task description
   * @param {string} taskDescription
   * @param {object} [options]
   * @param {number} [options.limit=5] - Max items per category
   * @param {number} [options.minScore=0.05] - Minimum relevance score
   * @returns {{ patterns: Array, expertise: Array, projects: Array }}
   */
  getContext(taskDescription, options = {}) {
    if (!this._ready) this.load();
    if (!this.search.isIndexed()) {
      return { patterns: [], expertise: [], projects: [] };
    }

    const { limit = 5, minScore = 0.05 } = options;

    const patterns = this.search.search(taskDescription, { type: 'pattern', limit, minScore });
    const expertise = this.search.search(taskDescription, { type: 'expertise', limit, minScore });
    const projects = this.search.search(taskDescription, { type: 'project', limit, minScore });

    return { patterns, expertise, projects };
  }

  /**
   * Get a formatted context string for injection into prompts
   * @param {string} taskDescription
   * @param {object} [options]
   * @returns {string}
   */
  getContextString(taskDescription, options = {}) {
    const ctx = this.getContext(taskDescription, options);
    const parts = [];

    if (ctx.patterns.length > 0) {
      parts.push('## Relevant Patterns');
      for (const p of ctx.patterns) {
        parts.push(`- ${p.text} (relevance: ${(p.score * 100).toFixed(0)}%)`);
      }
    }

    if (ctx.expertise.length > 0) {
      parts.push('## Relevant Expertise');
      for (const e of ctx.expertise) {
        parts.push(`- ${e.text} (relevance: ${(e.score * 100).toFixed(0)}%)`);
      }
    }

    if (ctx.projects.length > 0) {
      parts.push('## Related Projects');
      for (const p of ctx.projects) {
        parts.push(`- ${p.text} (relevance: ${(p.score * 100).toFixed(0)}%)`);
      }
    }

    return parts.length > 0 ? parts.join('\n') : 'No relevant context found.';
  }

  /**
   * Check if ready
   * @returns {boolean}
   */
  isReady() {
    return this._ready;
  }

  /**
   * Get stats
   * @returns {object}
   */
  getStats() {
    return {
      ready: this._ready,
      indexSize: this.search.getIndexSize(),
      vocabSize: this.search.getVocabSize(),
    };
  }

  /**
   * @private
   */
  _loadJson(filePath, defaultValue) {
    try {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    } catch {
      // Return default
    }
    return defaultValue;
  }
}

module.exports = { ContextInjector };
