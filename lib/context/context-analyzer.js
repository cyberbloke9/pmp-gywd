/**
 * Context Analyzer
 *
 * Analyzes codebase structure to understand file relationships.
 * Builds a relationship graph for intelligent context prediction.
 * Supports graph persistence for faster subsequent loads.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Default cache path for persistent graph
 */
const GRAPH_CACHE_DIR = path.join(os.homedir(), '.gywd', 'cache');
const GRAPH_CACHE_FILE = 'relationship-graph.json';
const GRAPH_VERSION = 2; // Increment when format changes

/**
 * Relationship types between files
 */
const RELATIONSHIP_TYPES = {
  IMPORTS: 'imports',
  IMPORTED_BY: 'imported_by',
  SAME_DIRECTORY: 'same_dir',
  SIMILAR_NAME: 'similar_name',
  TEST_FOR: 'test_for',
  TESTED_BY: 'tested_by',
  CO_MODIFIED: 'co_modified',
  CO_ACCESSED: 'co_accessed',
};

/**
 * Weight multipliers for relationship types
 */
const RELATIONSHIP_WEIGHTS = {
  [RELATIONSHIP_TYPES.IMPORTS]: 1.0,
  [RELATIONSHIP_TYPES.IMPORTED_BY]: 0.8,
  [RELATIONSHIP_TYPES.SAME_DIRECTORY]: 0.3,
  [RELATIONSHIP_TYPES.SIMILAR_NAME]: 0.5,
  [RELATIONSHIP_TYPES.TEST_FOR]: 0.9,
  [RELATIONSHIP_TYPES.TESTED_BY]: 0.9,
  [RELATIONSHIP_TYPES.CO_MODIFIED]: 0.7,
  [RELATIONSHIP_TYPES.CO_ACCESSED]: 0.6,
};

/**
 * Regex patterns for import detection
 */
const IMPORT_PATTERNS = {
  // ES6: import x from './file'
  esm: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
  // CommonJS: require('./file')
  cjs: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  // Dynamic import: import('./file')
  dynamic: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
};

/**
 * Context Analyzer class
 */
class ContextAnalyzer {
  constructor() {
    this.fileGraph = new Map(); // file -> Map<relatedFile, relationships[]>
    this.fileMetadata = new Map(); // file -> metadata
    this.keywords = new Map(); // keyword -> Set<files>
    this.directories = new Map(); // directory -> Set<files>
  }

  /**
   * Analyze a file and extract its relationships
   * @param {string} filePath - Path to the file
   * @param {string} content - File content
   * @returns {object} Analysis result
   */
  analyzeFile(filePath, content) {
    const normalizedPath = this.normalizePath(filePath);
    const ext = path.extname(filePath);
    const baseName = path.basename(filePath, ext);
    const dirName = path.dirname(filePath);

    // Initialize file in graph if needed
    if (!this.fileGraph.has(normalizedPath)) {
      this.fileGraph.set(normalizedPath, new Map());
    }

    // Store metadata
    const metadata = {
      path: normalizedPath,
      extension: ext,
      baseName,
      directory: dirName,
      size: content.length,
      lineCount: content.split('\n').length,
      isTest: this.isTestFile(filePath),
      lastAnalyzed: Date.now(),
    };
    this.fileMetadata.set(normalizedPath, metadata);

    // Track directory membership
    if (!this.directories.has(dirName)) {
      this.directories.set(dirName, new Set());
    }
    this.directories.get(dirName).add(normalizedPath);

    // Extract imports
    const imports = this.extractImports(content, dirName);

    // Extract keywords
    const keywords = this.extractKeywords(content, baseName);
    for (const keyword of keywords) {
      if (!this.keywords.has(keyword)) {
        this.keywords.set(keyword, new Set());
      }
      this.keywords.get(keyword).add(normalizedPath);
    }

    return {
      path: normalizedPath,
      metadata,
      imports,
      keywords,
    };
  }

  /**
   * Extract import statements from file content
   * @param {string} content - File content
   * @param {string} baseDir - Base directory for resolving relative paths
   * @returns {string[]} Array of imported file paths
   */
  extractImports(content, baseDir) {
    const imports = new Set();

    for (const [_type, regex] of Object.entries(IMPORT_PATTERNS)) {
      // Reset regex state
      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];

        // Skip external packages (no ./ or ../)
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
          continue;
        }

        // Resolve relative path
        const resolved = this.resolveImportPath(importPath, baseDir);
        if (resolved) {
          imports.add(resolved);
        }
      }
    }

    return Array.from(imports);
  }

  /**
   * Resolve an import path to a normalized file path
   * @param {string} importPath - Import path from source
   * @param {string} baseDir - Base directory
   * @returns {string|null} Resolved path or null
   */
  resolveImportPath(importPath, baseDir) {
    // Handle relative paths
    const resolved = path.resolve(baseDir, importPath);

    // Try common extensions if no extension
    if (!path.extname(resolved)) {
      const extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
      for (const ext of extensions) {
        if (fs.existsSync(resolved + ext)) {
          return this.normalizePath(resolved + ext);
        }
      }
      // Try index files
      for (const ext of extensions) {
        const indexPath = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexPath)) {
          return this.normalizePath(indexPath);
        }
      }
    }

    if (fs.existsSync(resolved)) {
      return this.normalizePath(resolved);
    }

    return null;
  }

  /**
   * Extract keywords from file content and name
   * @param {string} content - File content
   * @param {string} baseName - File base name
   * @returns {string[]} Array of keywords
   */
  extractKeywords(content, baseName) {
    const keywords = new Set();

    // Add words from file name (split on camelCase, PascalCase, kebab-case, snake_case)
    const nameWords = baseName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    nameWords.forEach(w => keywords.add(w));

    // Extract function/class names
    const functionMatches = content.matchAll(/(?:function|class|const|let|var)\s+(\w+)/g);
    for (const match of functionMatches) {
      const name = match[1].toLowerCase();
      if (name.length > 2) {
        keywords.add(name);
      }
    }

    // Extract common domain terms
    const domainTerms = [
      'auth', 'user', 'login', 'api', 'database', 'db', 'cache',
      'config', 'util', 'helper', 'service', 'controller', 'model',
      'view', 'component', 'route', 'middleware', 'test', 'spec',
      'payment', 'order', 'product', 'customer', 'admin', 'dashboard',
    ];

    const lowerContent = content.toLowerCase();
    for (const term of domainTerms) {
      if (lowerContent.includes(term)) {
        keywords.add(term);
      }
    }

    return Array.from(keywords);
  }

  /**
   * Check if a file is a test file
   * @param {string} filePath - File path
   * @returns {boolean}
   */
  isTestFile(filePath) {
    const lower = filePath.toLowerCase();
    return (
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.includes('__tests__') ||
      lower.includes('/test/') ||
      lower.includes('/tests/')
    );
  }

  /**
   * Build relationship graph from analyzed files
   */
  buildRelationshipGraph() {
    // Build import relationships
    for (const [filePath, _metadata] of this.fileMetadata) {
      const fileData = this.fileGraph.get(filePath);
      if (!fileData) continue;

      // Find test relationships
      this.findTestRelationships(filePath);

      // Find similar name relationships
      this.findSimilarNameRelationships(filePath);
    }

    // Build same-directory relationships
    for (const [_dir, files] of this.directories) {
      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        for (let j = i + 1; j < fileArray.length; j++) {
          this.addRelationship(fileArray[i], fileArray[j], RELATIONSHIP_TYPES.SAME_DIRECTORY);
        }
      }
    }
  }

  /**
   * Add import relationship between files
   * @param {string} fromFile - Importing file
   * @param {string} toFile - Imported file
   */
  addImportRelationship(fromFile, toFile) {
    this.addRelationship(fromFile, toFile, RELATIONSHIP_TYPES.IMPORTS);
    this.addRelationship(toFile, fromFile, RELATIONSHIP_TYPES.IMPORTED_BY);
  }

  /**
   * Find test-to-source relationships
   * @param {string} filePath - File to analyze
   */
  findTestRelationships(filePath) {
    const metadata = this.fileMetadata.get(filePath);
    if (!metadata) return;

    if (metadata.isTest) {
      // Find the source file this tests
      const sourcePattern = metadata.baseName
        .replace(/\.test$/, '')
        .replace(/\.spec$/, '')
        .replace(/Test$/, '')
        .replace(/Spec$/, '');

      for (const [otherPath, otherMeta] of this.fileMetadata) {
        if (otherPath === filePath) continue;
        if (otherMeta.isTest) continue;

        if (otherMeta.baseName.toLowerCase() === sourcePattern.toLowerCase()) {
          this.addRelationship(filePath, otherPath, RELATIONSHIP_TYPES.TEST_FOR);
          this.addRelationship(otherPath, filePath, RELATIONSHIP_TYPES.TESTED_BY);
        }
      }
    }
  }

  /**
   * Find similar name relationships
   * @param {string} filePath - File to analyze
   */
  findSimilarNameRelationships(filePath) {
    const metadata = this.fileMetadata.get(filePath);
    if (!metadata) return;

    const baseName = metadata.baseName.toLowerCase();

    for (const [otherPath, otherMeta] of this.fileMetadata) {
      if (otherPath === filePath) continue;

      const otherBase = otherMeta.baseName.toLowerCase();

      // Check if names share a common root (>50% overlap)
      if (this.calculateNameSimilarity(baseName, otherBase) > 0.5) {
        this.addRelationship(filePath, otherPath, RELATIONSHIP_TYPES.SIMILAR_NAME);
      }
    }
  }

  /**
   * Calculate name similarity between two strings
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {number} Similarity score (0-1)
   */
  calculateNameSimilarity(a, b) {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    // Check prefix match
    const minLen = Math.min(a.length, b.length);
    let prefixMatch = 0;
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) prefixMatch++;
      else break;
    }

    // Check if one contains the other
    if (a.includes(b) || b.includes(a)) {
      return 0.7;
    }

    return prefixMatch / Math.max(a.length, b.length);
  }

  /**
   * Add a relationship between two files
   * @param {string} from - Source file
   * @param {string} to - Target file
   * @param {string} type - Relationship type
   */
  addRelationship(from, to, type) {
    if (!this.fileGraph.has(from)) {
      this.fileGraph.set(from, new Map());
    }

    const relations = this.fileGraph.get(from);
    if (!relations.has(to)) {
      relations.set(to, []);
    }

    const existing = relations.get(to);
    if (!existing.includes(type)) {
      existing.push(type);
    }
  }

  /**
   * Record co-access pattern
   * @param {string[]} files - Files accessed together
   */
  recordCoAccess(files) {
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        this.addRelationship(files[i], files[j], RELATIONSHIP_TYPES.CO_ACCESSED);
        this.addRelationship(files[j], files[i], RELATIONSHIP_TYPES.CO_ACCESSED);
      }
    }
  }

  /**
   * Get related files with scores
   * @param {string} filePath - File to find relations for
   * @param {number} limit - Maximum results
   * @returns {Array<{file: string, score: number, relationships: string[]}>}
   */
  getRelatedFiles(filePath, limit = 10) {
    const normalizedPath = this.normalizePath(filePath);
    const relations = this.fileGraph.get(normalizedPath);

    if (!relations) return [];

    const scored = [];

    for (const [relatedFile, relationTypes] of relations) {
      let score = 0;
      for (const type of relationTypes) {
        score += RELATIONSHIP_WEIGHTS[type] || 0.1;
      }

      scored.push({
        file: relatedFile,
        score,
        relationships: relationTypes,
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit);
  }

  /**
   * Find files by keyword
   * @param {string} keyword - Keyword to search
   * @returns {string[]} Matching file paths
   */
  findByKeyword(keyword) {
    const lowerKeyword = keyword.toLowerCase();
    const files = this.keywords.get(lowerKeyword);
    return files ? Array.from(files) : [];
  }

  /**
   * Find files by multiple keywords (intersection)
   * @param {string[]} keywords - Keywords to search
   * @returns {string[]} Matching file paths
   */
  findByKeywords(keywords) {
    if (keywords.length === 0) return [];

    const sets = keywords
      .map(k => this.keywords.get(k.toLowerCase()))
      .filter(s => s !== undefined);

    if (sets.length === 0) return [];

    // Intersection of all sets
    let result = new Set(sets[0]);
    for (let i = 1; i < sets.length; i++) {
      result = new Set([...result].filter(x => sets[i].has(x)));
    }

    return Array.from(result);
  }

  /**
   * Normalize file path for consistent comparison
   * @param {string} filePath - File path
   * @returns {string} Normalized path
   */
  normalizePath(filePath) {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Get analysis summary
   * @returns {object} Summary statistics
   */
  getSummary() {
    let totalRelationships = 0;
    for (const relations of this.fileGraph.values()) {
      totalRelationships += relations.size;
    }

    return {
      filesAnalyzed: this.fileMetadata.size,
      totalRelationships,
      keywordsIndexed: this.keywords.size,
      directoriesTracked: this.directories.size,
    };
  }

  /**
   * Export graph data for persistence
   * @returns {object} Serializable graph data
   */
  export() {
    const graph = {};
    for (const [file, relations] of this.fileGraph) {
      graph[file] = {};
      for (const [related, types] of relations) {
        graph[file][related] = types;
      }
    }

    const metadata = {};
    for (const [file, meta] of this.fileMetadata) {
      metadata[file] = meta;
    }

    const keywords = {};
    for (const [keyword, files] of this.keywords) {
      keywords[keyword] = Array.from(files);
    }

    return { graph, metadata, keywords };
  }

  /**
   * Import graph data from persistence
   * @param {object} data - Previously exported data
   */
  import(data) {
    if (data.graph) {
      for (const [file, relations] of Object.entries(data.graph)) {
        this.fileGraph.set(file, new Map(Object.entries(relations)));
      }
    }

    if (data.metadata) {
      for (const [file, meta] of Object.entries(data.metadata)) {
        this.fileMetadata.set(file, meta);
      }
    }

    if (data.keywords) {
      for (const [keyword, files] of Object.entries(data.keywords)) {
        this.keywords.set(keyword, new Set(files));
      }
    }
  }

  /**
   * Clear all data
   */
  clear() {
    this.fileGraph.clear();
    this.fileMetadata.clear();
    this.keywords.clear();
    this.directories.clear();
  }

  /**
   * Get file hashes (mtime) for cache validation
   * @returns {object} Map of file -> mtime
   */
  getFileHashes() {
    const hashes = {};
    for (const [file, meta] of this.fileMetadata) {
      hashes[file] = meta.lastAnalyzed;
    }
    return hashes;
  }

  /**
   * Validate file hashes against current state
   * @param {object} hashes - Previously saved hashes
   * @returns {boolean} True if all files are unchanged
   */
  validateFileHashes(hashes) {
    if (!hashes || Object.keys(hashes).length === 0) {
      return false;
    }

    for (const [file, savedTime] of Object.entries(hashes)) {
      try {
        const stats = fs.statSync(file);
        // Allow 1 second tolerance for filesystem differences
        if (Math.abs(stats.mtimeMs - savedTime) > 1000) {
          return false;
        }
      } catch {
        // File doesn't exist anymore
        return false;
      }
    }

    return true;
  }

  /**
   * Save graph to disk for persistence
   * @param {string} cacheDir - Optional cache directory override
   * @returns {boolean} True if saved successfully
   */
  saveGraph(cacheDir = GRAPH_CACHE_DIR) {
    try {
      const cachePath = path.join(cacheDir, GRAPH_CACHE_FILE);

      // Ensure directory exists
      fs.mkdirSync(cacheDir, { recursive: true });

      const data = {
        version: GRAPH_VERSION,
        timestamp: Date.now(),
        ...this.export(),
        fileHashes: this.getFileHashes(),
      };

      fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load graph from disk if valid
   * @param {string} cacheDir - Optional cache directory override
   * @returns {boolean} True if loaded successfully
   */
  loadGraph(cacheDir = GRAPH_CACHE_DIR) {
    try {
      const cachePath = path.join(cacheDir, GRAPH_CACHE_FILE);

      if (!fs.existsSync(cachePath)) {
        return false;
      }

      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

      // Check version compatibility
      if (data.version !== GRAPH_VERSION) {
        return false;
      }

      // Validate cache freshness - use sampling for performance
      if (!this.validateFileHashesSampled(data.fileHashes)) {
        return false;
      }

      // Import the data
      this.import(data);

      // Rebuild directories from metadata
      for (const [file, meta] of this.fileMetadata) {
        const dir = meta.directory;
        if (!this.directories.has(dir)) {
          this.directories.set(dir, new Set());
        }
        this.directories.get(dir).add(file);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate a sample of file hashes for faster validation
   * @param {object} hashes - Previously saved hashes
   * @param {number} sampleSize - Number of files to sample
   * @returns {boolean} True if sample passes validation
   */
  validateFileHashesSampled(hashes, sampleSize = 10) {
    if (!hashes || Object.keys(hashes).length === 0) {
      return false;
    }

    const files = Object.keys(hashes);

    // Always validate if small number of files
    if (files.length <= sampleSize) {
      return this.validateFileHashes(hashes);
    }

    // Random sample for larger sets
    const sample = [];
    const step = Math.floor(files.length / sampleSize);
    for (let i = 0; i < files.length && sample.length < sampleSize; i += step) {
      sample.push(files[i]);
    }

    // Check sampled files
    for (const file of sample) {
      try {
        const stats = fs.statSync(file);
        if (Math.abs(stats.mtimeMs - hashes[file]) > 1000) {
          return false;
        }
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Delete cached graph
   * @param {string} cacheDir - Optional cache directory override
   * @returns {boolean} True if deleted successfully
   */
  deleteCachedGraph(cacheDir = GRAPH_CACHE_DIR) {
    try {
      const cachePath = path.join(cacheDir, GRAPH_CACHE_FILE);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get cache status
   * @param {string} cacheDir - Optional cache directory override
   * @returns {object} Cache status info
   */
  getCacheStatus(cacheDir = GRAPH_CACHE_DIR) {
    try {
      const cachePath = path.join(cacheDir, GRAPH_CACHE_FILE);

      if (!fs.existsSync(cachePath)) {
        return { exists: false };
      }

      const stats = fs.statSync(cachePath);
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

      return {
        exists: true,
        size: stats.size,
        timestamp: data.timestamp,
        age: Date.now() - data.timestamp,
        version: data.version,
        isCompatible: data.version === GRAPH_VERSION,
        fileCount: Object.keys(data.fileHashes || {}).length,
      };
    } catch {
      return { exists: false, error: true };
    }
  }
}

module.exports = {
  ContextAnalyzer,
  RELATIONSHIP_TYPES,
  RELATIONSHIP_WEIGHTS,
  GRAPH_CACHE_DIR,
  GRAPH_VERSION,
};
