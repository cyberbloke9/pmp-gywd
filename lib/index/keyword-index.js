'use strict';

/**
 * Keyword Index
 *
 * Inverted index for O(1) keyword → files lookup.
 * Supports multi-keyword search with ranked results.
 * Zero external dependencies.
 */

/**
 * KeywordIndex class
 * Provides fast keyword-to-file lookups using an inverted index.
 */
class KeywordIndex {
  constructor() {
    this.index = new Map(); // keyword (lowercase) -> Set<filePath>
    this.fileKeywords = new Map(); // filePath -> Set<keyword>
    this.buildTime = null;
    this.searchCount = 0;
  }

  /**
   * Add a file with its keywords to the index
   * @param {string} filePath - File path
   * @param {string[]} keywords - Array of keywords for this file
   */
  addFile(filePath, keywords) {
    // Remove old keywords for this file first (handles updates)
    this.removeFile(filePath);

    // Normalize and dedupe keywords
    const keywordSet = new Set(
      keywords.map(k => k.toLowerCase().trim()).filter(k => k.length > 0)
    );

    this.fileKeywords.set(filePath, keywordSet);

    // Add to inverted index
    for (const keyword of keywordSet) {
      if (!this.index.has(keyword)) {
        this.index.set(keyword, new Set());
      }
      this.index.get(keyword).add(filePath);
    }
  }

  /**
   * Remove a file from the index
   * @param {string} filePath - File path
   */
  removeFile(filePath) {
    const oldKeywords = this.fileKeywords.get(filePath);

    if (oldKeywords) {
      for (const keyword of oldKeywords) {
        const files = this.index.get(keyword);
        if (files) {
          files.delete(filePath);
          // Clean up empty keyword entries
          if (files.size === 0) {
            this.index.delete(keyword);
          }
        }
      }
      this.fileKeywords.delete(filePath);
    }
  }

  /**
   * Search for files by a single keyword (O(1) lookup)
   * @param {string} keyword - Keyword to search
   * @returns {Set<string>} Set of matching file paths
   */
  search(keyword) {
    this.searchCount++;
    const lowerKeyword = keyword.toLowerCase().trim();
    return this.index.get(lowerKeyword) || new Set();
  }

  /**
   * Search for files matching multiple keywords with ranking
   * @param {string[]} keywords - Keywords to search
   * @returns {Array<{file: string, matchCount: number, matchedKeywords: string[]}>}
   */
  searchMultiple(keywords) {
    this.searchCount++;
    const results = new Map(); // filePath -> { count, keywords }

    const normalizedKeywords = keywords
      .map(k => k.toLowerCase().trim())
      .filter(k => k.length > 0);

    for (const keyword of normalizedKeywords) {
      const files = this.index.get(keyword);
      if (files) {
        for (const file of files) {
          if (!results.has(file)) {
            results.set(file, { count: 0, keywords: [] });
          }
          const entry = results.get(file);
          entry.count++;
          entry.keywords.push(keyword);
        }
      }
    }

    // Sort by match count descending
    return Array.from(results.entries())
      .map(([file, data]) => ({
        file,
        matchCount: data.count,
        matchedKeywords: data.keywords,
      }))
      .sort((a, b) => b.matchCount - a.matchCount);
  }

  /**
   * Search with fuzzy matching (prefix match)
   * @param {string} prefix - Keyword prefix to match
   * @returns {Array<{keyword: string, fileCount: number}>}
   */
  searchByPrefix(prefix) {
    const lowerPrefix = prefix.toLowerCase().trim();
    const matches = [];

    for (const [keyword, files] of this.index) {
      if (keyword.startsWith(lowerPrefix)) {
        matches.push({
          keyword,
          fileCount: files.size,
        });
      }
    }

    return matches.sort((a, b) => b.fileCount - a.fileCount);
  }

  /**
   * Get all keywords for a file
   * @param {string} filePath - File path
   * @returns {string[]} Array of keywords
   */
  getKeywordsForFile(filePath) {
    const keywords = this.fileKeywords.get(filePath);
    return keywords ? Array.from(keywords) : [];
  }

  /**
   * Get files that share keywords with a given file
   * @param {string} filePath - File path
   * @param {number} limit - Maximum results
   * @returns {Array<{file: string, sharedKeywords: string[], score: number}>}
   */
  getSimilarFiles(filePath, limit = 10) {
    const fileKeywords = this.fileKeywords.get(filePath);
    if (!fileKeywords) return [];

    const scores = new Map(); // file -> { shared: Set, score: number }

    for (const keyword of fileKeywords) {
      const files = this.index.get(keyword);
      if (files) {
        for (const file of files) {
          if (file !== filePath) {
            if (!scores.has(file)) {
              scores.set(file, { shared: new Set(), score: 0 });
            }
            scores.get(file).shared.add(keyword);
            scores.get(file).score++;
          }
        }
      }
    }

    return Array.from(scores.entries())
      .map(([file, data]) => ({
        file,
        sharedKeywords: Array.from(data.shared),
        score: data.score / fileKeywords.size, // Normalize by total keywords
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get index statistics
   * @returns {object}
   */
  getStats() {
    let totalMappings = 0;
    for (const files of this.index.values()) {
      totalMappings += files.size;
    }

    return {
      uniqueKeywords: this.index.size,
      indexedFiles: this.fileKeywords.size,
      totalMappings,
      averageKeywordsPerFile: this.fileKeywords.size > 0
        ? (totalMappings / this.fileKeywords.size).toFixed(1)
        : '0',
      buildTime: this.buildTime,
      searchCount: this.searchCount,
    };
  }

  /**
   * Get top keywords by file count
   * @param {number} limit - Maximum results
   * @returns {Array<{keyword: string, fileCount: number}>}
   */
  getTopKeywords(limit = 20) {
    const results = [];

    for (const [keyword, files] of this.index) {
      results.push({
        keyword,
        fileCount: files.size,
      });
    }

    return results
      .sort((a, b) => b.fileCount - a.fileCount)
      .slice(0, limit);
  }

  /**
   * Clear the index
   */
  clear() {
    this.index.clear();
    this.fileKeywords.clear();
    this.buildTime = null;
    this.searchCount = 0;
  }

  /**
   * Export index for persistence
   * @returns {object}
   */
  export() {
    const index = {};
    for (const [keyword, files] of this.index) {
      index[keyword] = Array.from(files);
    }

    const fileKeywords = {};
    for (const [file, keywords] of this.fileKeywords) {
      fileKeywords[file] = Array.from(keywords);
    }

    return {
      index,
      fileKeywords,
      buildTime: this.buildTime,
      stats: this.getStats(),
    };
  }

  /**
   * Import index from persistence
   * @param {object} data - Previously exported data
   */
  import(data) {
    if (data.index) {
      for (const [keyword, files] of Object.entries(data.index)) {
        this.index.set(keyword, new Set(files));
      }
    }

    if (data.fileKeywords) {
      for (const [file, keywords] of Object.entries(data.fileKeywords)) {
        this.fileKeywords.set(file, new Set(keywords));
      }
    }

    if (data.buildTime) {
      this.buildTime = data.buildTime;
    }
  }

  /**
   * Record build completion time
   * @param {number} durationMs - Build duration in milliseconds
   */
  recordBuildTime(durationMs) {
    this.buildTime = durationMs;
  }
}

// Singleton instance for global usage
const keywordIndex = new KeywordIndex();

module.exports = {
  KeywordIndex,
  keywordIndex,
};
