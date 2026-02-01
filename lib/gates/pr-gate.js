'use strict';

/**
 * PR Gate
 *
 * Validates that tests pass and requirements are met before allowing PR creation.
 * Part of Phase 27: PR Gate.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Gate check results
 */
const GATE_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  WARNING: 'warning',
};

/**
 * PRGate class
 */
class PRGate {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.planningDir = options.planningDir || path.join(this.projectRoot, '.planning');
    this.checks = [];
    this.results = [];
  }

  /**
   * Run all gate checks
   * @returns {object} Gate results
   */
  async runAllChecks() {
    this.results = [];

    const checks = [
      { name: 'Tests', fn: () => this.checkTests() },
      { name: 'Uncommitted Changes', fn: () => this.checkUncommitted() },
      { name: 'Branch Up to Date', fn: () => this.checkBranchUpToDate() },
      { name: 'Verify Work Complete', fn: () => this.checkVerifyWork() },
      { name: 'No Unresolved Issues', fn: () => this.checkIssues() },
    ];

    for (const check of checks) {
      try {
        const result = await check.fn();
        this.results.push({
          name: check.name,
          ...result,
        });
      } catch (error) {
        this.results.push({
          name: check.name,
          status: GATE_STATUS.FAILED,
          message: error.message,
        });
      }
    }

    const passed = this.results.every(r =>
      r.status === GATE_STATUS.PASSED || r.status === GATE_STATUS.SKIPPED
    );

    return {
      passed,
      results: this.results,
      summary: this._generateSummary(),
    };
  }

  /**
   * Check if tests pass
   * @returns {object}
   */
  checkTests() {
    try {
      // Check if package.json exists with test script
      const pkgPath = path.join(this.projectRoot, 'package.json');
      if (!fs.existsSync(pkgPath)) {
        return {
          status: GATE_STATUS.SKIPPED,
          message: 'No package.json found',
        };
      }

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (!pkg.scripts || !pkg.scripts.test) {
        return {
          status: GATE_STATUS.SKIPPED,
          message: 'No test script defined',
        };
      }

      // Run tests
      execSync('npm test', {
        cwd: this.projectRoot,
        stdio: 'pipe',
        timeout: 300000, // 5 minutes
      });

      return {
        status: GATE_STATUS.PASSED,
        message: 'All tests passed',
      };
    } catch (error) {
      return {
        status: GATE_STATUS.FAILED,
        message: 'Tests failed',
        details: error.message,
      };
    }
  }

  /**
   * Check for uncommitted changes
   * @returns {object}
   */
  checkUncommitted() {
    try {
      const output = execSync('git status --porcelain', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      });

      if (output.trim()) {
        return {
          status: GATE_STATUS.FAILED,
          message: 'Uncommitted changes detected',
          details: output.trim().split('\n').slice(0, 10).join('\n'),
        };
      }

      return {
        status: GATE_STATUS.PASSED,
        message: 'Working directory clean',
      };
    } catch {
      return {
        status: GATE_STATUS.SKIPPED,
        message: 'Not a git repository',
      };
    }
  }

  /**
   * Check if branch is up to date with remote
   * @returns {object}
   */
  checkBranchUpToDate() {
    try {
      // Fetch latest
      execSync('git fetch origin', {
        cwd: this.projectRoot,
        stdio: 'pipe',
      });

      // Check if behind
      const behind = execSync('git rev-list HEAD..@{u} --count', {
        cwd: this.projectRoot,
        encoding: 'utf8',
      }).trim();

      if (parseInt(behind) > 0) {
        return {
          status: GATE_STATUS.WARNING,
          message: `Branch is ${behind} commits behind remote`,
        };
      }

      return {
        status: GATE_STATUS.PASSED,
        message: 'Branch is up to date',
      };
    } catch {
      return {
        status: GATE_STATUS.SKIPPED,
        message: 'No remote tracking branch',
      };
    }
  }

  /**
   * Check if verify-work was completed for current phase
   * @returns {object}
   */
  checkVerifyWork() {
    try {
      const statePath = path.join(this.planningDir, 'STATE.md');
      if (!fs.existsSync(statePath)) {
        return {
          status: GATE_STATUS.SKIPPED,
          message: 'No GYWD project found',
        };
      }

      // Check for recent verification
      const issuesPath = path.join(this.planningDir, 'ISSUES.md');
      if (fs.existsSync(issuesPath)) {
        const issues = fs.readFileSync(issuesPath, 'utf8');
        const openCount = (issues.match(/\[ \]/g) || []).length;

        if (openCount > 0) {
          return {
            status: GATE_STATUS.WARNING,
            message: `${openCount} open issues in ISSUES.md`,
          };
        }
      }

      return {
        status: GATE_STATUS.PASSED,
        message: 'No blocking issues',
      };
    } catch {
      return {
        status: GATE_STATUS.SKIPPED,
        message: 'Could not check verify status',
      };
    }
  }

  /**
   * Check for unresolved issues
   * @returns {object}
   */
  checkIssues() {
    try {
      const issuesPath = path.join(this.planningDir, 'ISSUES.md');
      if (!fs.existsSync(issuesPath)) {
        return {
          status: GATE_STATUS.PASSED,
          message: 'No issues file',
        };
      }

      const content = fs.readFileSync(issuesPath, 'utf8');
      const blockers = content.match(/\*\*Severity:\*\*\s*blocker/gi) || [];

      if (blockers.length > 0) {
        return {
          status: GATE_STATUS.FAILED,
          message: `${blockers.length} blocking issue(s) found`,
        };
      }

      return {
        status: GATE_STATUS.PASSED,
        message: 'No blocking issues',
      };
    } catch {
      return {
        status: GATE_STATUS.SKIPPED,
        message: 'Could not check issues',
      };
    }
  }

  /**
   * Generate summary of all checks
   * @returns {string}
   */
  _generateSummary() {
    const lines = ['## PR Gate Summary', ''];

    const statusIcon = {
      [GATE_STATUS.PASSED]: '✓',
      [GATE_STATUS.FAILED]: '✗',
      [GATE_STATUS.SKIPPED]: '○',
      [GATE_STATUS.WARNING]: '⚠',
    };

    for (const result of this.results) {
      const icon = statusIcon[result.status] || '?';
      lines.push(`${icon} ${result.name}: ${result.message}`);
    }

    lines.push('');

    const passed = this.results.filter(r => r.status === GATE_STATUS.PASSED).length;
    const failed = this.results.filter(r => r.status === GATE_STATUS.FAILED).length;
    const warnings = this.results.filter(r => r.status === GATE_STATUS.WARNING).length;

    lines.push(`**Result:** ${passed} passed, ${failed} failed, ${warnings} warnings`);

    return lines.join('\n');
  }

  /**
   * Get pass/fail result
   * @returns {boolean}
   */
  isPassing() {
    return this.results.every(r =>
      r.status === GATE_STATUS.PASSED || r.status === GATE_STATUS.SKIPPED
    );
  }
}

module.exports = {
  PRGate,
  GATE_STATUS,
};
