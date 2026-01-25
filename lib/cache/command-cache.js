'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Command Cache
 *
 * Caches command definitions to avoid re-parsing markdown files
 * on every invocation. Commands are loaded once per session and
 * cached in memory.
 *
 * @example
 * const { commandCache } = require('./command-cache');
 * commandCache.loadAll('./commands/gywd');
 * const cmd = commandCache.get('progress');
 */
class CommandCache {
  constructor() {
    this.definitions = new Map();
    this.loadTime = null;
    this.loadedAt = null;
    this.sourceDir = null;
  }

  /**
   * Get a cached command definition
   * @param {string} commandName - Command name (without .md extension)
   * @returns {object|undefined} Cached definition or undefined
   */
  get(commandName) {
    return this.definitions.get(commandName);
  }

  /**
   * Set a command definition in cache
   * @param {string} commandName - Command name
   * @param {object} definition - Command definition object
   */
  set(commandName, definition) {
    this.definitions.set(commandName, {
      ...definition,
      cachedAt: Date.now(),
    });
  }

  /**
   * Check if a command is cached
   * @param {string} commandName - Command name
   * @returns {boolean}
   */
  has(commandName) {
    return this.definitions.has(commandName);
  }

  /**
   * Remove a command from cache
   * @param {string} commandName - Command name
   * @returns {boolean} True if deleted
   */
  delete(commandName) {
    return this.definitions.delete(commandName);
  }

  /**
   * Load all command definitions from a directory
   * @param {string} commandsDir - Path to commands directory
   * @returns {number} Number of commands loaded
   */
  loadAll(commandsDir) {
    const start = Date.now();
    this.sourceDir = commandsDir;
    this.definitions.clear();

    if (!fs.existsSync(commandsDir)) {
      this.loadTime = Date.now() - start;
      this.loadedAt = Date.now();
      return 0;
    }

    const files = this._scanDir(commandsDir, '.md');

    for (const filePath of files) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const name = path.basename(filePath, '.md');
        const definition = this._parseCommandFile(content, filePath);
        this.set(name, definition);
      } catch (_err) {
        // Skip files that can't be parsed
      }
    }

    this.loadTime = Date.now() - start;
    this.loadedAt = Date.now();

    return this.definitions.size;
  }

  /**
   * Scan a directory recursively for files with given extension
   * @private
   * @param {string} dir - Directory to scan
   * @param {string} ext - File extension to match
   * @returns {string[]} Array of file paths
   */
  _scanDir(dir, ext) {
    const results = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results.push(...this._scanDir(fullPath, ext));
        } else if (entry.isFile() && entry.name.endsWith(ext)) {
          results.push(fullPath);
        }
      }
    } catch (_err) {
      // Skip directories that can't be read
    }

    return results;
  }

  /**
   * Parse a command markdown file into a definition object
   * @private
   * @param {string} content - File content
   * @param {string} filePath - Path to file
   * @returns {object} Parsed definition
   */
  _parseCommandFile(content, filePath) {
    const definition = {
      path: filePath,
      content,
      frontmatter: null,
      objective: null,
      hasProcess: false,
    };

    // Parse frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      definition.frontmatter = this._parseFrontmatter(frontmatterMatch[1]);
    }

    // Extract objective
    const objectiveMatch = content.match(/<objective[^>]*>([\s\S]*?)<\/objective>/i);
    if (objectiveMatch) {
      definition.objective = objectiveMatch[1].trim();
    }

    // Check for process section
    definition.hasProcess = /<process[^>]*>/i.test(content);

    return definition;
  }

  /**
   * Parse YAML-like frontmatter
   * @private
   * @param {string} yaml - Frontmatter content
   * @returns {object} Parsed frontmatter
   */
  _parseFrontmatter(yaml) {
    const result = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    return {
      size: this.definitions.size,
      loadTime: this.loadTime,
      loadedAt: this.loadedAt,
      sourceDir: this.sourceDir,
    };
  }

  /**
   * Check if cache needs refresh (e.g., after long session)
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   * @returns {boolean} True if cache should be refreshed
   */
  needsRefresh(maxAge = 60 * 60 * 1000) {
    if (!this.loadedAt) return true;
    return Date.now() - this.loadedAt > maxAge;
  }

  /**
   * Clear the cache
   */
  clear() {
    this.definitions.clear();
    this.loadTime = null;
    this.loadedAt = null;
    this.sourceDir = null;
  }

  /**
   * Get all command names
   * @returns {string[]} Array of command names
   */
  getCommandNames() {
    return Array.from(this.definitions.keys());
  }
}

// Singleton instance for global command caching
const commandCache = new CommandCache();

module.exports = {
  CommandCache,
  commandCache,
};
