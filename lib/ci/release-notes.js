'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Release Notes Generator
 *
 * Generates structured release notes from GYWD project data:
 * - Phase completions from ROADMAP.md
 * - Key decisions from phase summaries
 * - Pattern changes from patterns.json
 * - Stats from STATE.md
 */
class ReleaseNotesGenerator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.planningDir = options.planningDir || path.join(this.projectRoot, '.planning');
    this.globalDir = options.globalDir || path.join(require('os').homedir(), '.gywd', 'global');
  }

  /**
   * Generate release notes
   * @param {object} options
   * @param {string} options.version - Version string (e.g., "5.0.0")
   * @param {string} options.previousVersion - Previous version for comparison
   * @param {string} options.title - Custom title
   * @param {string[]} options.highlights - Manual highlight bullets
   * @param {boolean} options.includeDecisions - Include decision graph (default: true)
   * @param {boolean} options.includePatterns - Include pattern summary (default: true)
   * @param {boolean} options.includeStats - Include project stats (default: true)
   * @returns {object} Release notes data and markdown
   */
  generate(options = {}) {
    const version = options.version || this._detectVersion();
    const title = options.title || `Release ${version}`;
    const includeDecisions = options.includeDecisions !== false;
    const includePatterns = options.includePatterns !== false;
    const includeStats = options.includeStats !== false;

    const data = {
      version,
      title,
      date: new Date().toISOString().split('T')[0],
      highlights: options.highlights || [],
      phases: this._getCompletedPhases(),
      decisions: includeDecisions ? this._getDecisions() : [],
      patterns: includePatterns ? this._getPatternSummary() : null,
      stats: includeStats ? this._getStats() : null,
      breaking: [],
    };

    const markdown = this._renderMarkdown(data);

    return { data, markdown };
  }

  /**
   * Detect version from package.json
   */
  _detectVersion() {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
      } catch { /* ignore */ }
    }
    return '0.0.0';
  }

  /**
   * Get completed phases from ROADMAP.md
   */
  _getCompletedPhases() {
    const phases = [];
    const roadmapPath = path.join(this.planningDir, 'ROADMAP.md');

    if (!fs.existsSync(roadmapPath)) return phases;

    try {
      const content = fs.readFileSync(roadmapPath, 'utf8');

      // Match phase headers with checkboxes
      const phasePattern = /####\s+Phase\s+(\d+):\s*([^\n]+?)(?:\s*✅)?\s*\n/g;
      let match;

      while ((match = phasePattern.exec(content)) !== null) {
        const phaseNum = parseInt(match[1], 10);
        const phaseName = match[2].replace(/\s*✅\s*$/, '').trim();

        // Check if this phase section has completed items
        const sectionStart = match.index;
        const nextPhase = content.indexOf('#### Phase', sectionStart + 1);
        const section = content.substring(sectionStart, nextPhase > 0 ? nextPhase : undefined);

        const completedItems = (section.match(/- \[x\]/g) || []).length;

        if (completedItems > 0) {
          // Extract deliverables
          const deliverableMatch = section.match(/\*\*Deliverables?:\*\*\s*([^\n]+)/);

          phases.push({
            number: phaseNum,
            name: phaseName,
            completedItems,
            deliverables: deliverableMatch ? deliverableMatch[1].trim() : null,
          });
        }
      }
    } catch { /* ignore */ }

    return phases;
  }

  /**
   * Get decisions from phase summaries
   */
  _getDecisions() {
    const decisions = [];
    const phasesDir = path.join(this.planningDir, 'phases');

    if (!fs.existsSync(phasesDir)) return decisions;

    try {
      const phaseDirs = fs.readdirSync(phasesDir).filter(d => {
        const full = path.join(phasesDir, d);
        return fs.statSync(full).isDirectory();
      });

      for (const dir of phaseDirs) {
        const dirPath = path.join(phasesDir, dir);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));

        for (const file of files) {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf8');

          // Extract decisions section
          const decisionBlock = content.match(/##\s+(?:Key\s+)?Decisions?\b([^]*?)(?=\n##|\n---|$)/i);
          if (decisionBlock) {
            const items = decisionBlock[1].match(/[-*]\s+\*\*([^*]+)\*\*(?:\s*[-–:]\s*(.+))?/g) || [];
            for (const item of items) {
              const parsed = item.match(/[-*]\s+\*\*([^*]+)\*\*(?:\s*[-–:]\s*(.+))?/);
              if (parsed) {
                decisions.push({
                  phase: dir,
                  decision: parsed[1].trim(),
                  rationale: parsed[2] ? parsed[2].trim() : null,
                });
              }
            }
          }
        }
      }
    } catch { /* ignore */ }

    return decisions;
  }

  /**
   * Get pattern summary from patterns.json
   */
  _getPatternSummary() {
    const patternsPath = path.join(this.globalDir, 'patterns.json');
    if (!fs.existsSync(patternsPath)) return null;

    try {
      const patterns = JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
      if (!Array.isArray(patterns)) return null;

      const byType = {};
      let highConfidence = 0;

      for (const p of patterns) {
        const type = p.type || 'unknown';
        byType[type] = (byType[type] || 0) + 1;
        if (p.confidence >= 0.7) highConfidence++;
      }

      return {
        total: patterns.length,
        highConfidence,
        byType,
      };
    } catch { return null; }
  }

  /**
   * Get project stats from STATE.md
   */
  _getStats() {
    const statePath = path.join(this.planningDir, 'STATE.md');
    if (!fs.existsSync(statePath)) return null;

    try {
      const content = fs.readFileSync(statePath, 'utf8');
      const stats = {};

      // Parse table rows
      const tableRows = content.match(/\|\s*(\w[\w\s]*?)\s*\|\s*(.+?)\s*\|/g) || [];
      for (const row of tableRows) {
        const match = row.match(/\|\s*(\w[\w\s]*?)\s*\|\s*(.+?)\s*\|/);
        if (match) {
          const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
          const value = match[2].trim();
          if (key !== 'metric' && key !== '--------' && key !== '-------') {
            stats[key] = value;
          }
        }
      }

      return stats;
    } catch { return null; }
  }

  /**
   * Render markdown from release data
   */
  _renderMarkdown(data) {
    const lines = [];

    lines.push(`# ${data.title}`);
    lines.push('');
    lines.push(`**Date:** ${data.date}`);
    lines.push(`**Version:** ${data.version}`);
    lines.push('');

    // Highlights
    if (data.highlights.length > 0) {
      lines.push('## Highlights');
      lines.push('');
      for (const h of data.highlights) {
        lines.push(`- ${h}`);
      }
      lines.push('');
    }

    // Phases completed
    if (data.phases.length > 0) {
      lines.push('## Phases Completed');
      lines.push('');
      for (const phase of data.phases) {
        let line = `- **Phase ${phase.number}: ${phase.name}**`;
        if (phase.completedItems) line += ` (${phase.completedItems} items)`;
        lines.push(line);
        if (phase.deliverables) {
          lines.push(`  - Deliverables: ${phase.deliverables}`);
        }
      }
      lines.push('');
    }

    // Key decisions
    if (data.decisions.length > 0) {
      lines.push('## Key Decisions');
      lines.push('');
      lines.push('| Phase | Decision | Rationale |');
      lines.push('|-------|----------|-----------|');
      for (const d of data.decisions) {
        lines.push(`| ${d.phase} | ${d.decision} | ${d.rationale || '-'} |`);
      }
      lines.push('');
    }

    // Patterns
    if (data.patterns) {
      lines.push('## Pattern Summary');
      lines.push('');
      lines.push(`- **Total patterns:** ${data.patterns.total}`);
      lines.push(`- **High confidence (≥0.7):** ${data.patterns.highConfidence}`);
      if (Object.keys(data.patterns.byType).length > 0) {
        lines.push('- **By type:**');
        for (const [type, count] of Object.entries(data.patterns.byType)) {
          lines.push(`  - ${type}: ${count}`);
        }
      }
      lines.push('');
    }

    // Stats
    if (data.stats && Object.keys(data.stats).length > 0) {
      lines.push('## Project Stats');
      lines.push('');
      lines.push('| Metric | Value |');
      lines.push('|--------|-------|');
      for (const [key, value] of Object.entries(data.stats)) {
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        lines.push(`| ${label} | ${value} |`);
      }
      lines.push('');
    }

    // Breaking changes
    if (data.breaking.length > 0) {
      lines.push('## Breaking Changes');
      lines.push('');
      for (const b of data.breaking) {
        lines.push(`- ${b}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push(`*Generated by GYWD CI/CD Integration*`);

    return lines.join('\n');
  }
}

module.exports = {
  ReleaseNotesGenerator,
};
