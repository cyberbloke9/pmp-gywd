'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Check status constants
 */
const CHECK_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  WARNING: 'warning',
  SKIPPED: 'skipped',
};

/**
 * Pre-Merge Validator
 *
 * Runs GYWD-aware validation checks before merging code.
 * Checks drift, decision conflicts, test health, and pattern consistency.
 */
class PreMergeValidator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.planningDir = options.planningDir || path.join(this.projectRoot, '.planning');
    this.globalDir = options.globalDir || path.join(require('os').homedir(), '.gywd', 'global');
    this.strict = options.strict !== undefined ? options.strict : false;
    this.checks = new Map();
    this._registerDefaultChecks();
  }

  /**
   * Register default GYWD checks
   */
  _registerDefaultChecks() {
    this.registerCheck('drift', 'Drift Detection', (ctx) => this._checkDrift(ctx));
    this.registerCheck('decisions', 'Decision Conflicts', (ctx) => this._checkDecisions(ctx));
    this.registerCheck('test-health', 'Test Health', (ctx) => this._checkTestHealth(ctx));
    this.registerCheck('patterns', 'Pattern Consistency', (ctx) => this._checkPatterns(ctx));
    this.registerCheck('phase-alignment', 'Phase Alignment', (ctx) => this._checkPhaseAlignment(ctx));
    this.registerCheck('state-integrity', 'State File Integrity', (ctx) => this._checkStateIntegrity(ctx));
  }

  /**
   * Register a custom check
   * @param {string} id - Unique check ID
   * @param {string} name - Human-readable name
   * @param {Function} fn - Check function receiving context, returns {status, message, details?}
   */
  registerCheck(id, name, fn) {
    this.checks.set(id, { id, name, fn });
  }

  /**
   * Remove a check
   * @param {string} id
   * @returns {boolean}
   */
  removeCheck(id) {
    return this.checks.delete(id);
  }

  /**
   * Run all registered checks
   * @param {object} options - Run options
   * @param {string[]} options.only - Only run these check IDs
   * @param {string[]} options.skip - Skip these check IDs
   * @returns {object} Validation report
   */
  validate(options = {}) {
    const context = this._buildContext();
    const results = [];

    for (const [id, check] of this.checks) {
      if (options.only && !options.only.includes(id)) continue;
      if (options.skip && options.skip.includes(id)) continue;

      try {
        const result = check.fn(context);
        results.push({
          id,
          name: check.name,
          ...result,
        });
      } catch (error) {
        results.push({
          id,
          name: check.name,
          status: CHECK_STATUS.FAILED,
          message: `Check error: ${error.message}`,
        });
      }
    }

    const passed = results.filter(r => r.status === CHECK_STATUS.PASSED).length;
    const failed = results.filter(r => r.status === CHECK_STATUS.FAILED).length;
    const warnings = results.filter(r => r.status === CHECK_STATUS.WARNING).length;
    const skipped = results.filter(r => r.status === CHECK_STATUS.SKIPPED).length;

    const overallPassed = this.strict
      ? failed === 0 && warnings === 0
      : failed === 0;

    return {
      passed: overallPassed,
      summary: { total: results.length, passed, failed, warnings, skipped },
      results,
      timestamp: Date.now(),
      projectRoot: this.projectRoot,
    };
  }

  /**
   * Build context object for checks
   */
  _buildContext() {
    const ctx = {
      projectRoot: this.projectRoot,
      planningDir: this.planningDir,
      globalDir: this.globalDir,
      state: null,
      roadmap: null,
      patterns: [],
      decisions: [],
      packageJson: null,
    };

    // Load STATE.md
    const statePath = path.join(this.planningDir, 'STATE.md');
    if (fs.existsSync(statePath)) {
      ctx.state = fs.readFileSync(statePath, 'utf8');
    }

    // Load ROADMAP.md
    const roadmapPath = path.join(this.planningDir, 'ROADMAP.md');
    if (fs.existsSync(roadmapPath)) {
      ctx.roadmap = fs.readFileSync(roadmapPath, 'utf8');
    }

    // Load patterns
    const patternsPath = path.join(this.globalDir, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      try {
        ctx.patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      } catch { /* ignore parse errors */ }
    }

    // Load package.json
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        ctx.packageJson = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      } catch { /* ignore */ }
    }

    // Load decisions from planning phases
    ctx.decisions = this._loadDecisions();

    return ctx;
  }

  /**
   * Load decisions from phase summary files
   */
  _loadDecisions() {
    const decisions = [];
    const phasesDir = path.join(this.planningDir, 'phases');

    if (!fs.existsSync(phasesDir)) return decisions;

    try {
      const phaseDirs = fs.readdirSync(phasesDir).filter(d => {
        const full = path.join(phasesDir, d);
        return fs.statSync(full).isDirectory();
      });

      for (const dir of phaseDirs) {
        const summaryFiles = fs.readdirSync(path.join(phasesDir, dir))
          .filter(f => f.endsWith('-SUMMARY.md'));

        for (const file of summaryFiles) {
          const content = fs.readFileSync(path.join(phasesDir, dir, file), 'utf8');
          const decisionMatches = content.match(/##\s+(?:Key\s+)?Decisions?\b[^]*?(?=\n##|\n---|$)/gi);
          if (decisionMatches) {
            for (const block of decisionMatches) {
              const items = block.match(/[-*]\s+\*\*([^*]+)\*\*/g) || [];
              for (const item of items) {
                const match = item.match(/[-*]\s+\*\*([^*]+)\*\*/);
                if (match) {
                  decisions.push({
                    phase: dir,
                    decision: match[1].trim(),
                    source: file,
                  });
                }
              }
            }
          }
        }
      }
    } catch { /* ignore read errors */ }

    return decisions;
  }

  /**
   * Check 1: Drift Detection
   * Checks if current work has drifted from the declared phase/plan.
   */
  _checkDrift(ctx) {
    if (!ctx.state) {
      return { status: CHECK_STATUS.SKIPPED, message: 'No STATE.md found' };
    }

    const issues = [];

    // Check if state declares a phase
    const phaseMatch = ctx.state.match(/\*\*Phase:\*\*\s*(\d+)\s+of\s+(\d+)/);
    if (!phaseMatch) {
      issues.push('STATE.md missing current phase declaration');
    }

    // Check if status is declared
    const statusMatch = ctx.state.match(/\*\*Status:\*\*\s*(.+)/);
    if (!statusMatch) {
      issues.push('STATE.md missing status declaration');
    }

    // Check for stale state (last activity > 7 days old)
    const activityMatch = ctx.state.match(/Last activity:\s*(\d{4}-\d{2}-\d{2})/);
    if (activityMatch) {
      const lastActivity = new Date(activityMatch[1]);
      const daysSince = Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 7) {
        issues.push(`State file is ${daysSince} days stale (last activity: ${activityMatch[1]})`);
      }
    }

    // Check if roadmap and state are consistent
    if (ctx.roadmap && phaseMatch) {
      const currentPhase = parseInt(phaseMatch[1], 10);
      const phaseInRoadmap = ctx.roadmap.includes(`Phase ${currentPhase}`);
      if (!phaseInRoadmap) {
        issues.push(`Phase ${currentPhase} declared in STATE.md but not found in ROADMAP.md`);
      }
    }

    if (issues.length === 0) {
      return { status: CHECK_STATUS.PASSED, message: 'No drift detected' };
    }

    return {
      status: issues.some(i => i.includes('missing')) ? CHECK_STATUS.FAILED : CHECK_STATUS.WARNING,
      message: `${issues.length} drift issue(s) found`,
      details: issues,
    };
  }

  /**
   * Check 2: Decision Conflicts
   * Detects contradictory decisions across phases.
   */
  _checkDecisions(ctx) {
    if (ctx.decisions.length === 0) {
      return { status: CHECK_STATUS.SKIPPED, message: 'No decisions found' };
    }

    const conflicts = [];
    const decisionMap = new Map();

    // Group decisions by topic keywords
    for (const d of ctx.decisions) {
      const words = d.decision.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length < 4) continue; // skip short words
        if (!decisionMap.has(word)) decisionMap.set(word, []);
        decisionMap.get(word).push(d);
      }
    }

    // Check for contradictory patterns (e.g., "use X" vs "avoid X" or "use Y" for same topic)
    const contradictionPairs = [
      ['use', 'avoid'], ['add', 'remove'], ['enable', 'disable'],
      ['include', 'exclude'], ['require', 'optional'],
    ];

    for (const [positive, negative] of contradictionPairs) {
      const positiveDecisions = ctx.decisions.filter(d =>
        d.decision.toLowerCase().includes(positive),
      );
      const negativeDecisions = ctx.decisions.filter(d =>
        d.decision.toLowerCase().includes(negative),
      );

      for (const pos of positiveDecisions) {
        for (const neg of negativeDecisions) {
          if (pos.phase === neg.phase) continue; // same phase, not a conflict

          // Check if they share a significant keyword
          const posWords = new Set(pos.decision.toLowerCase().split(/\s+/).filter(w => w.length >= 4));
          const negWords = new Set(neg.decision.toLowerCase().split(/\s+/).filter(w => w.length >= 4));
          const shared = [...posWords].filter(w => negWords.has(w) && w !== positive && w !== negative);

          if (shared.length > 0) {
            conflicts.push({
              decision1: `${pos.phase}: ${pos.decision}`,
              decision2: `${neg.phase}: ${neg.decision}`,
              sharedTopics: shared,
            });
          }
        }
      }
    }

    if (conflicts.length === 0) {
      return {
        status: CHECK_STATUS.PASSED,
        message: `${ctx.decisions.length} decisions analyzed, no conflicts`,
      };
    }

    return {
      status: CHECK_STATUS.WARNING,
      message: `${conflicts.length} potential conflict(s) found`,
      details: conflicts,
    };
  }

  /**
   * Check 3: Test Health
   * Validates test infrastructure is in good shape.
   */
  _checkTestHealth(ctx) {
    if (!ctx.packageJson) {
      return { status: CHECK_STATUS.SKIPPED, message: 'No package.json found' };
    }

    const issues = [];

    // Check test script exists
    if (!ctx.packageJson.scripts || !ctx.packageJson.scripts.test) {
      return { status: CHECK_STATUS.FAILED, message: 'No test script defined in package.json' };
    }

    // Check for jest dependency
    const deps = { ...ctx.packageJson.dependencies, ...ctx.packageJson.devDependencies };
    const hasJest = deps && (deps.jest || deps.vitest || deps.mocha);
    if (!hasJest) {
      issues.push('No test framework found in dependencies');
    }

    // Check for CI test script
    if (!ctx.packageJson.scripts['test:ci']) {
      issues.push('No test:ci script for CI environments');
    }

    // Check test directory exists
    const testDir = path.join(this.projectRoot, 'tests');
    if (!fs.existsSync(testDir)) {
      issues.push('No tests/ directory found');
    } else {
      // Count test files
      const testFiles = this._countTestFiles(testDir);
      if (testFiles === 0) {
        issues.push('No test files found in tests/');
      }
    }

    // Check STATE.md for test count
    if (ctx.state) {
      const testCountMatch = ctx.state.match(/Tests\s*\|\s*([\d,]+)/);
      if (testCountMatch) {
        const count = parseInt(testCountMatch[1].replace(/,/g, ''), 10);
        if (count < 10) {
          issues.push(`Only ${count} tests recorded in STATE.md`);
        }
      }
    }

    if (issues.length === 0) {
      return { status: CHECK_STATUS.PASSED, message: 'Test infrastructure looks healthy' };
    }

    const hasCritical = issues.some(i =>
      i.includes('No test script') || i.includes('No test files'),
    );

    return {
      status: hasCritical ? CHECK_STATUS.FAILED : CHECK_STATUS.WARNING,
      message: `${issues.length} test health issue(s)`,
      details: issues,
    };
  }

  /**
   * Check 4: Pattern Consistency
   * Ensures patterns.json is well-formed and patterns have adequate confidence.
   */
  _checkPatterns(ctx) {
    if (!Array.isArray(ctx.patterns) || ctx.patterns.length === 0) {
      return { status: CHECK_STATUS.SKIPPED, message: 'No patterns loaded' };
    }

    const issues = [];
    let lowConfidence = 0;
    let noType = 0;

    for (const pattern of ctx.patterns) {
      if (!pattern.type) noType++;
      if (pattern.confidence !== undefined && pattern.confidence < 0.3) {
        lowConfidence++;
      }
    }

    if (noType > 0) {
      issues.push(`${noType} pattern(s) missing type classification`);
    }
    if (lowConfidence > ctx.patterns.length * 0.5) {
      issues.push(`${lowConfidence}/${ctx.patterns.length} patterns have very low confidence (<0.3)`);
    }

    if (issues.length === 0) {
      return {
        status: CHECK_STATUS.PASSED,
        message: `${ctx.patterns.length} patterns are consistent`,
      };
    }

    return {
      status: CHECK_STATUS.WARNING,
      message: `${issues.length} pattern issue(s)`,
      details: issues,
    };
  }

  /**
   * Check 5: Phase Alignment
   * Verifies the current phase is properly tracked.
   */
  _checkPhaseAlignment(ctx) {
    if (!ctx.state || !ctx.roadmap) {
      return { status: CHECK_STATUS.SKIPPED, message: 'Missing STATE.md or ROADMAP.md' };
    }

    const issues = [];

    // Parse progress from STATE.md
    const progressMatch = ctx.state.match(/(\d+)%\s*overall/);
    const phaseMatch = ctx.state.match(/\*\*Phase:\*\*\s*(\d+)\s+of\s+(\d+)/);

    if (progressMatch && phaseMatch) {
      const progress = parseInt(progressMatch[1], 10);
      const current = parseInt(phaseMatch[1], 10);
      const total = parseInt(phaseMatch[2], 10);

      // Check that progress roughly matches phase/total ratio
      const expectedProgress = Math.round((current / total) * 100);
      const drift = Math.abs(progress - expectedProgress);

      if (drift > 20) {
        issues.push(`Progress (${progress}%) is significantly different from phase ratio (${current}/${total} ≈ ${expectedProgress}%)`);
      }
    }

    // Check that completed phases in roadmap match STATE.md count
    const completeCount = (ctx.roadmap.match(/✅|Complete/g) || []).length;
    const stateCompleteMatch = ctx.state.match(/(\d+)\s*complete/);

    if (stateCompleteMatch && completeCount > 0) {
      const stateCount = parseInt(stateCompleteMatch[1], 10);
      // Rough check — roadmap might have more ✅ markers than actual phases
      if (Math.abs(stateCount - completeCount) > 10) {
        issues.push(`STATE.md says ${stateCount} complete but ROADMAP.md has ~${completeCount} completion markers`);
      }
    }

    if (issues.length === 0) {
      return { status: CHECK_STATUS.PASSED, message: 'Phase tracking is aligned' };
    }

    return {
      status: CHECK_STATUS.WARNING,
      message: `${issues.length} alignment issue(s)`,
      details: issues,
    };
  }

  /**
   * Check 6: State File Integrity
   * Validates that GYWD state files are well-formed.
   */
  _checkStateIntegrity(ctx) {
    const issues = [];

    // Check STATE.md has required sections
    if (ctx.state) {
      const requiredSections = ['Project Summary', 'Current Position'];
      for (const section of requiredSections) {
        if (!ctx.state.includes(section)) {
          issues.push(`STATE.md missing "${section}" section`);
        }
      }
    } else {
      return { status: CHECK_STATUS.SKIPPED, message: 'No STATE.md found' };
    }

    // Check ROADMAP.md has required sections
    if (ctx.roadmap) {
      if (!ctx.roadmap.includes('## ') && !ctx.roadmap.includes('# ')) {
        issues.push('ROADMAP.md has no section headers');
      }
    }

    // Check patterns.json is valid
    const patternsPath = path.join(this.globalDir, 'patterns.json');
    if (fs.existsSync(patternsPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
        if (!Array.isArray(data)) {
          issues.push('patterns.json is not an array');
        }
      } catch (e) {
        issues.push(`patterns.json parse error: ${e.message}`);
      }
    }

    if (issues.length === 0) {
      return { status: CHECK_STATUS.PASSED, message: 'State files are well-formed' };
    }

    return {
      status: issues.some(i => i.includes('missing') || i.includes('error')) ? CHECK_STATUS.FAILED : CHECK_STATUS.WARNING,
      message: `${issues.length} integrity issue(s)`,
      details: issues,
    };
  }

  /**
   * Count test files recursively
   */
  _countTestFiles(dir) {
    let count = 0;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          count += this._countTestFiles(path.join(dir, entry.name));
        } else if (entry.isFile() && (entry.name.endsWith('.test.js') || entry.name.endsWith('.spec.js'))) {
          count++;
        }
      }
    } catch { /* ignore */ }
    return count;
  }

  /**
   * Generate a markdown report
   * @param {object} report - Validation report from validate()
   * @returns {string} Markdown formatted report
   */
  formatReport(report) {
    const lines = ['# GYWD Pre-Merge Validation Report', ''];

    const icon = {
      [CHECK_STATUS.PASSED]: '✅',
      [CHECK_STATUS.FAILED]: '❌',
      [CHECK_STATUS.WARNING]: '⚠️',
      [CHECK_STATUS.SKIPPED]: '⏭️',
    };

    lines.push(`**Result:** ${report.passed ? 'PASSED' : 'FAILED'}`);
    lines.push(`**Checks:** ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings, ${report.summary.skipped} skipped`);
    lines.push('');

    for (const result of report.results) {
      lines.push(`${icon[result.status] || '?'} **${result.name}**: ${result.message}`);
      if (result.details) {
        if (Array.isArray(result.details)) {
          for (const detail of result.details) {
            if (typeof detail === 'string') {
              lines.push(`  - ${detail}`);
            } else {
              lines.push(`  - ${JSON.stringify(detail)}`);
            }
          }
        }
      }
    }

    lines.push('');
    lines.push(`---`);
    lines.push(`*Generated at ${new Date(report.timestamp).toISOString()}*`);

    return lines.join('\n');
  }
}

module.exports = {
  PreMergeValidator,
  CHECK_STATUS,
};
