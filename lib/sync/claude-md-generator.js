'use strict';

/**
 * CLAUDE.md Generator
 *
 * Generates CLAUDE.md from PROJECT.md, decisions, and roadmap.
 * Part of Phase 26: CLAUDE.md Sync.
 */

const fs = require('fs');
const path = require('path');

/**
 * ClaudeMdGenerator class
 */
class ClaudeMdGenerator {
  constructor(planningDir) {
    this.planningDir = planningDir;
  }

  /**
   * Generate CLAUDE.md content
   * @returns {string} Generated markdown content
   */
  generate() {
    const project = this._readFile('PROJECT.md');
    const roadmap = this._readFile('ROADMAP.md');
    const state = this._readFile('STATE.md');

    const sections = [];

    // Header
    sections.push('# Project Context for Claude');
    sections.push('');
    sections.push('> Auto-generated from GYWD planning files. Do not edit directly.');
    sections.push('');

    // Project Overview
    if (project) {
      const overview = this._extractSection(project, 'What This Is') ||
                       this._extractSection(project, 'Overview');
      if (overview) {
        sections.push('## Project Overview');
        sections.push('');
        sections.push(overview.trim());
        sections.push('');
      }
    }

    // Current State
    if (state) {
      const focus = this._extractField(state, 'Focus');
      const milestone = this._extractField(state, 'Current milestone');
      const phase = this._extractField(state, 'Phase');

      sections.push('## Current State');
      sections.push('');
      if (milestone) sections.push(`- **Milestone:** ${milestone}`);
      if (phase) sections.push(`- **Phase:** ${phase}`);
      if (focus) sections.push(`- **Focus:** ${focus}`);
      sections.push('');
    }

    // Key Requirements
    if (project) {
      const reqs = this._extractSection(project, 'Requirements') ||
                   this._extractSection(project, 'Core Requirements');
      if (reqs) {
        sections.push('## Key Requirements');
        sections.push('');
        sections.push(reqs.trim());
        sections.push('');
      }
    }

    // Constraints
    if (project) {
      const constraints = this._extractSection(project, 'Constraints');
      if (constraints) {
        sections.push('## Constraints');
        sections.push('');
        sections.push(constraints.trim());
        sections.push('');
      }
    }

    // Key Decisions
    if (project) {
      const decisions = this._extractSection(project, 'Key Decisions') ||
                        this._extractSection(project, 'Decisions');
      if (decisions) {
        sections.push('## Key Decisions');
        sections.push('');
        sections.push(decisions.trim());
        sections.push('');
      }
    }

    // Architecture Notes
    if (project) {
      const arch = this._extractSection(project, 'Architecture');
      if (arch) {
        sections.push('## Architecture');
        sections.push('');
        sections.push(arch.trim());
        sections.push('');
      }
    }

    // Progress Summary
    if (roadmap) {
      const progress = this._extractProgressSummary(roadmap);
      if (progress) {
        sections.push('## Progress');
        sections.push('');
        sections.push(progress);
        sections.push('');
      }
    }

    // Footer
    sections.push('---');
    sections.push('');
    sections.push(`*Generated: ${new Date().toISOString()}*`);
    sections.push('');
    sections.push('*Source: .planning/PROJECT.md, STATE.md, ROADMAP.md*');

    return sections.join('\n');
  }

  /**
   * Write CLAUDE.md to project root
   * @param {string} projectRoot - Project root directory
   * @returns {boolean} True if written successfully
   */
  write(projectRoot) {
    try {
      const content = this.generate();
      const claudePath = path.join(projectRoot, 'CLAUDE.md');
      fs.writeFileSync(claudePath, content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if regeneration is needed
   * @param {string} projectRoot - Project root directory
   * @returns {boolean} True if CLAUDE.md should be regenerated
   */
  needsRegeneration(projectRoot) {
    const claudePath = path.join(projectRoot, 'CLAUDE.md');

    if (!fs.existsSync(claudePath)) {
      return true;
    }

    const claudeStat = fs.statSync(claudePath);
    const sources = ['PROJECT.md', 'STATE.md', 'ROADMAP.md'];

    for (const source of sources) {
      const sourcePath = path.join(this.planningDir, source);
      if (fs.existsSync(sourcePath)) {
        const sourceStat = fs.statSync(sourcePath);
        if (sourceStat.mtimeMs > claudeStat.mtimeMs) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Read a file from planning directory
   * @param {string} filename
   * @returns {string|null}
   */
  _readFile(filename) {
    try {
      const filePath = path.join(this.planningDir, filename);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract a section from markdown
   * @param {string} content - Markdown content
   * @param {string} heading - Section heading
   * @returns {string|null}
   */
  _extractSection(content, heading) {
    const regex = new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract a field value
   * @param {string} content
   * @param {string} field
   * @returns {string|null}
   */
  _extractField(content, field) {
    const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, 'i');
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract progress summary from roadmap
   * @param {string} roadmap
   * @returns {string|null}
   */
  _extractProgressSummary(roadmap) {
    const milestones = [];

    // Match milestone lines
    const regex = /[-*]\s*(✅|🚧|📋)\s*\*\*([^*]+)\*\*/g;
    let match;

    while ((match = regex.exec(roadmap)) !== null) {
      const status = match[1] === '✅' ? 'Complete' :
                     match[1] === '🚧' ? 'In Progress' : 'Planned';
      milestones.push(`- ${match[2].trim()}: ${status}`);
    }

    return milestones.length > 0 ? milestones.join('\n') : null;
  }
}

module.exports = {
  ClaudeMdGenerator,
};
