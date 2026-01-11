/**
 * Dependency Analyzer
 *
 * Analyzes project dependencies to identify:
 * - Internal module dependencies
 * - Circular dependencies
 * - Dependency graphs
 * - Independent modules (can be tested/built in parallel)
 * - Coupling metrics
 */

const fs = require('fs');
const path = require('path');

/**
 * Import pattern matchers
 */
const IMPORT_PATTERNS = {
  esm: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
  cjs: /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  dynamic: /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
};

/**
 * Dependency types
 */
const DEP_TYPES = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
  BUILTIN: 'builtin',
};

/**
 * Node.js built-in modules
 */
const BUILTIN_MODULES = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants',
  'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'sys',
  'timers', 'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'zlib',
]);

/**
 * Dependency Analyzer class
 */
class DependencyAnalyzer {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.extensions = options.extensions || ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs'];
    this.excludeDirs = options.excludeDirs || ['node_modules', '.git', 'dist', 'build', 'coverage'];
    this.dependencies = new Map();
    this.reverseDeps = new Map();
    this.fileContents = new Map();
  }

  /**
   * Analyze a directory recursively
   * @param {string} dir - Directory to analyze
   * @returns {object} Analysis results
   */
  analyze(dir = this.rootDir) {
    this.clear();
    this.scanDirectory(dir);
    this.buildReverseDependencies();

    return {
      files: this.dependencies.size,
      dependencies: this.getDependencyStats(),
      circular: this.findCircularDependencies(),
      independent: this.findIndependentModules(),
      coupling: this.calculateCoupling(),
      layers: this.detectLayers(),
    };
  }

  /**
   * Scan directory for source files
   * @param {string} dir - Directory to scan
   */
  scanDirectory(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!this.excludeDirs.includes(entry.name)) {
          this.scanDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.extensions.includes(ext)) {
          this.analyzeFile(fullPath);
        }
      }
    }
  }

  /**
   * Analyze a single file for dependencies
   * @param {string} filePath - File to analyze
   */
  analyzeFile(filePath) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      return;
    }

    this.fileContents.set(filePath, content);
    const deps = this.extractDependencies(content, path.dirname(filePath));
    this.dependencies.set(filePath, deps);
  }

  /**
   * Extract dependencies from file content
   * @param {string} content - File content
   * @param {string} baseDir - Base directory for resolving paths
   * @returns {Array<{path: string, type: string, raw: string}>}
   */
  extractDependencies(content, baseDir) {
    const deps = [];
    const seen = new Set();

    for (const [_name, regex] of Object.entries(IMPORT_PATTERNS)) {
      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(content)) !== null) {
        const raw = match[1];
        if (seen.has(raw)) continue;
        seen.add(raw);

        const dep = this.classifyDependency(raw, baseDir);
        deps.push(dep);
      }
    }

    return deps;
  }

  /**
   * Classify a dependency as internal, external, or builtin
   * @param {string} importPath - Import path
   * @param {string} baseDir - Base directory
   * @returns {{path: string, type: string, raw: string}}
   */
  classifyDependency(importPath, baseDir) {
    const raw = importPath;

    // Check for built-in modules
    if (BUILTIN_MODULES.has(importPath) || importPath.startsWith('node:')) {
      return { path: importPath, type: DEP_TYPES.BUILTIN, raw };
    }

    // Check for relative imports (internal)
    if (importPath.startsWith('.') || importPath.startsWith('/')) {
      const resolved = this.resolveImport(importPath, baseDir);
      return { path: resolved || importPath, type: DEP_TYPES.INTERNAL, raw };
    }

    // Everything else is external (npm packages)
    return { path: importPath.split('/')[0], type: DEP_TYPES.EXTERNAL, raw };
  }

  /**
   * Resolve a relative import to absolute path
   * @param {string} importPath - Import path
   * @param {string} baseDir - Base directory
   * @returns {string|null}
   */
  resolveImport(importPath, baseDir) {
    const resolved = path.resolve(baseDir, importPath);

    // Try with extensions
    for (const ext of this.extensions) {
      const withExt = resolved + ext;
      if (fs.existsSync(withExt)) {
        return withExt;
      }
    }

    // Try index files
    for (const ext of this.extensions) {
      const indexPath = path.join(resolved, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }

    // Try exact path
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    return null;
  }

  /**
   * Build reverse dependency map
   */
  buildReverseDependencies() {
    this.reverseDeps.clear();

    for (const [file, deps] of this.dependencies) {
      for (const dep of deps) {
        if (dep.type === DEP_TYPES.INTERNAL && dep.path) {
          if (!this.reverseDeps.has(dep.path)) {
            this.reverseDeps.set(dep.path, new Set());
          }
          this.reverseDeps.get(dep.path).add(file);
        }
      }
    }
  }

  /**
   * Find circular dependencies
   * @returns {Array<string[]>} Array of circular dependency chains
   */
  findCircularDependencies() {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    const dfs = (file, chain = []) => {
      if (recursionStack.has(file)) {
        const cycleStart = chain.indexOf(file);
        if (cycleStart !== -1) {
          const cycle = chain.slice(cycleStart);
          cycle.push(file);
          cycles.push(cycle.map(f => this.relativePath(f)));
        }
        return;
      }

      if (visited.has(file)) return;

      visited.add(file);
      recursionStack.add(file);
      chain.push(file);

      const deps = this.dependencies.get(file) || [];
      for (const dep of deps) {
        if (dep.type === DEP_TYPES.INTERNAL && dep.path) {
          dfs(dep.path, [...chain]);
        }
      }

      recursionStack.delete(file);
    };

    for (const file of this.dependencies.keys()) {
      dfs(file);
    }

    // Deduplicate cycles
    const uniqueCycles = [];
    const seen = new Set();

    for (const cycle of cycles) {
      const normalized = this.normalizeCycle(cycle);
      const key = normalized.join('->');
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCycles.push(cycle);
      }
    }

    return uniqueCycles;
  }

  /**
   * Normalize a cycle for deduplication
   * @param {string[]} cycle - Cycle to normalize
   * @returns {string[]}
   */
  normalizeCycle(cycle) {
    if (cycle.length <= 1) return cycle;

    const withoutLast = cycle.slice(0, -1);
    const minIndex = withoutLast.indexOf(
      withoutLast.reduce((min, curr) => curr < min ? curr : min),
    );

    return [...withoutLast.slice(minIndex), ...withoutLast.slice(0, minIndex)];
  }

  /**
   * Find independent modules (no internal dependencies)
   * @returns {string[]}
   */
  findIndependentModules() {
    const independent = [];

    for (const [file, deps] of this.dependencies) {
      const internalDeps = deps.filter(d => d.type === DEP_TYPES.INTERNAL);
      if (internalDeps.length === 0) {
        independent.push(this.relativePath(file));
      }
    }

    return independent;
  }

  /**
   * Calculate coupling metrics
   * @returns {object}
   */
  calculateCoupling() {
    const metrics = {
      afferentCoupling: new Map(),
      efferentCoupling: new Map(),
      instability: new Map(),
    };

    for (const [file, deps] of this.dependencies) {
      const relPath = this.relativePath(file);
      const internalDeps = deps.filter(d => d.type === DEP_TYPES.INTERNAL);

      // Efferent coupling (outgoing dependencies)
      metrics.efferentCoupling.set(relPath, internalDeps.length);

      // Afferent coupling (incoming dependencies)
      const incoming = this.reverseDeps.get(file)?.size || 0;
      metrics.afferentCoupling.set(relPath, incoming);

      // Instability = Ce / (Ca + Ce)
      const ce = internalDeps.length;
      const ca = incoming;
      const instability = (ca + ce) > 0 ? ce / (ca + ce) : 0;
      metrics.instability.set(relPath, Math.round(instability * 100) / 100);
    }

    return {
      afferent: Object.fromEntries(metrics.afferentCoupling),
      efferent: Object.fromEntries(metrics.efferentCoupling),
      instability: Object.fromEntries(metrics.instability),
      averageInstability: this.average([...metrics.instability.values()]),
    };
  }

  /**
   * Detect architectural layers based on directory structure
   * @returns {object}
   */
  detectLayers() {
    const layers = new Map();

    for (const file of this.dependencies.keys()) {
      const relPath = this.relativePath(file);
      const parts = relPath.split(path.sep);

      // Use first directory as layer
      const layer = parts.length > 1 ? parts[0] : 'root';

      if (!layers.has(layer)) {
        layers.set(layer, { files: [], dependencies: new Set() });
      }

      layers.get(layer).files.push(relPath);

      // Track cross-layer dependencies
      const deps = this.dependencies.get(file) || [];
      for (const dep of deps) {
        if (dep.type === DEP_TYPES.INTERNAL && dep.path) {
          const depRel = this.relativePath(dep.path);
          const depParts = depRel.split(path.sep);
          const depLayer = depParts.length > 1 ? depParts[0] : 'root';

          if (depLayer !== layer) {
            layers.get(layer).dependencies.add(depLayer);
          }
        }
      }
    }

    const result = {};
    for (const [layer, data] of layers) {
      result[layer] = {
        fileCount: data.files.length,
        files: data.files,
        dependsOn: Array.from(data.dependencies),
      };
    }

    return result;
  }

  /**
   * Get dependency statistics
   * @returns {object}
   */
  getDependencyStats() {
    let internal = 0;
    let external = 0;
    let builtin = 0;
    const externalPackages = new Set();

    for (const deps of this.dependencies.values()) {
      for (const dep of deps) {
        switch (dep.type) {
          case DEP_TYPES.INTERNAL:
            internal++;
            break;
          case DEP_TYPES.EXTERNAL:
            external++;
            externalPackages.add(dep.path);
            break;
          case DEP_TYPES.BUILTIN:
            builtin++;
            break;
          default:
            // Unknown type, skip
            break;
        }
      }
    }

    return {
      internal,
      external,
      builtin,
      total: internal + external + builtin,
      externalPackages: Array.from(externalPackages).sort(),
    };
  }

  /**
   * Get files that depend on a given file
   * @param {string} filePath - File to check
   * @returns {string[]}
   */
  getDependents(filePath) {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootDir, filePath);

    const dependents = this.reverseDeps.get(absPath);
    return dependents
      ? Array.from(dependents).map(f => this.relativePath(f))
      : [];
  }

  /**
   * Get files that a given file depends on
   * @param {string} filePath - File to check
   * @returns {string[]}
   */
  getDependencies(filePath) {
    const absPath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(this.rootDir, filePath);

    const deps = this.dependencies.get(absPath) || [];
    return deps
      .filter(d => d.type === DEP_TYPES.INTERNAL)
      .map(d => this.relativePath(d.path))
      .filter(Boolean);
  }

  /**
   * Get topological sort order for building/testing
   * @returns {string[]}
   */
  getTopologicalOrder() {
    const order = [];
    const visited = new Set();
    const temp = new Set();

    const visit = (file) => {
      if (temp.has(file)) return; // Circular dependency
      if (visited.has(file)) return;

      temp.add(file);

      const deps = this.dependencies.get(file) || [];
      for (const dep of deps) {
        if (dep.type === DEP_TYPES.INTERNAL && dep.path && this.dependencies.has(dep.path)) {
          visit(dep.path);
        }
      }

      temp.delete(file);
      visited.add(file);
      order.push(this.relativePath(file));
    };

    for (const file of this.dependencies.keys()) {
      visit(file);
    }

    return order;
  }

  /**
   * Generate dependency graph in DOT format
   * @returns {string}
   */
  toDot() {
    const lines = ['digraph Dependencies {', '  rankdir=LR;', '  node [shape=box];'];

    for (const [file, deps] of this.dependencies) {
      const from = this.relativePath(file).replace(/[/\\]/g, '_').replace(/\./g, '_');

      for (const dep of deps) {
        if (dep.type === DEP_TYPES.INTERNAL && dep.path) {
          const to = this.relativePath(dep.path).replace(/[/\\]/g, '_').replace(/\./g, '_');
          lines.push(`  ${from} -> ${to};`);
        }
      }
    }

    lines.push('}');
    return lines.join('\n');
  }

  /**
   * Generate dependency report as markdown
   * @returns {string}
   */
  toMarkdown() {
    const analysis = this.analyze();
    const lines = [
      '# Dependency Analysis Report',
      '',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      '',
      `- **Total Files**: ${analysis.files}`,
      `- **Internal Dependencies**: ${analysis.dependencies.internal}`,
      `- **External Dependencies**: ${analysis.dependencies.external}`,
      `- **Built-in Dependencies**: ${analysis.dependencies.builtin}`,
      `- **Average Instability**: ${analysis.coupling.averageInstability.toFixed(2)}`,
      '',
    ];

    if (analysis.circular.length > 0) {
      lines.push('## Circular Dependencies ⚠️', '');
      for (const cycle of analysis.circular) {
        lines.push(`- ${cycle.join(' → ')}`);
      }
      lines.push('');
    }

    if (analysis.dependencies.externalPackages.length > 0) {
      lines.push('## External Packages', '');
      for (const pkg of analysis.dependencies.externalPackages) {
        lines.push(`- ${pkg}`);
      }
      lines.push('');
    }

    lines.push('## Layers', '');
    for (const [layer, data] of Object.entries(analysis.layers)) {
      lines.push(`### ${layer}`, '');
      lines.push(`- Files: ${data.fileCount}`);
      if (data.dependsOn.length > 0) {
        lines.push(`- Depends on: ${data.dependsOn.join(', ')}`);
      }
      lines.push('');
    }

    if (analysis.independent.length > 0) {
      lines.push('## Independent Modules', '');
      lines.push('These modules have no internal dependencies and can be tested in isolation:', '');
      for (const mod of analysis.independent) {
        lines.push(`- ${mod}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Get relative path from root
   * @param {string} absPath - Absolute path
   * @returns {string}
   */
  relativePath(absPath) {
    if (!absPath) return '';
    return path.relative(this.rootDir, absPath);
  }

  /**
   * Calculate average of array
   * @param {number[]} arr - Array of numbers
   * @returns {number}
   */
  average(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  /**
   * Clear all data
   */
  clear() {
    this.dependencies.clear();
    this.reverseDeps.clear();
    this.fileContents.clear();
  }

  /**
   * Export analysis data
   * @returns {object}
   */
  export() {
    const deps = {};
    for (const [file, fileDeps] of this.dependencies) {
      deps[this.relativePath(file)] = fileDeps;
    }

    return {
      rootDir: this.rootDir,
      dependencies: deps,
      analysis: this.analyze(),
    };
  }
}

module.exports = {
  DependencyAnalyzer,
  DEP_TYPES,
  BUILTIN_MODULES,
};
