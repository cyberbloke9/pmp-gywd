'use strict';

/**
 * Metrics Dashboard
 *
 * Renders performance metrics in a human-readable format.
 * Used by /gywd:context --perf and other diagnostic commands.
 */

/**
 * MetricsDashboard class
 * Provides formatted output for performance metrics.
 */
class MetricsDashboard {
  /**
   * @param {object} tracker - PerformanceTracker instance
   * @param {object} [options] - Dashboard options
   */
  constructor(tracker, options = {}) {
    this.tracker = tracker;
    this.compact = options.compact || false;
  }

  /**
   * Render the full metrics dashboard
   * @returns {string} Markdown formatted dashboard
   */
  render() {
    const report = this.tracker.getReport();
    const lines = [];

    lines.push('## Performance Metrics Dashboard');
    lines.push('');

    // Session info
    lines.push(`**Session uptime:** ${this._duration(report.sessionUptime)}`);
    lines.push('');

    // Cache performance
    lines.push('### Cache Performance');
    lines.push('');
    lines.push('| Cache | Size | Hits | Misses | Hit Rate | Avg Hit Time |');
    lines.push('|-------|------|------|--------|----------|--------------|');

    for (const [name, stats] of Object.entries(report.cache)) {
      const total = stats.hits + stats.misses;
      const hitRate = total > 0 ? ((stats.hits / total) * 100).toFixed(0) : '0';
      const avgTime = stats.hits > 0 ? (stats.totalHitTimeMs / stats.hits).toFixed(2) : '0.00';
      lines.push(`| ${name} | ${stats.size || '-'} | ${stats.hits} | ${stats.misses} | ${hitRate}% | ${avgTime}ms |`);
    }
    lines.push('');

    // File I/O
    lines.push('### File I/O');
    lines.push('');
    lines.push('| Operation | Count | Bytes |');
    lines.push('|-----------|-------|-------|');
    lines.push(`| Reads | ${report.fileIO.reads} | ${this._bytes(report.fileIO.readBytes)} |`);
    lines.push(`| Writes | ${report.fileIO.writes} | ${this._bytes(report.fileIO.writeBytes)} |`);
    lines.push(`| Scans | ${report.fileIO.scans} | - |`);
    lines.push('');

    // Memory optimization
    lines.push('### Memory Optimization');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Batched writes | ${report.memory.batchedWrites} |`);
    lines.push(`| Immediate writes | ${report.memory.immediateWrites} |`);
    lines.push(`| Pattern records | ${report.memory.patternRecords} |`);

    const batchRatio = report.memory.batchedWrites + report.memory.immediateWrites > 0
      ? ((report.memory.batchedWrites / (report.memory.batchedWrites + report.memory.immediateWrites)) * 100).toFixed(0)
      : '0';
    lines.push(`| Batch efficiency | ${batchRatio}% |`);
    lines.push('');

    // Commands
    lines.push('### Commands');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Cached commands | ${report.commands.cached} |`);
    lines.push(`| Fresh loads | ${report.commands.loaded} |`);

    const cmdTotal = report.commands.cached + report.commands.loaded;
    const cmdHitRate = cmdTotal > 0 ? ((report.commands.cached / cmdTotal) * 100).toFixed(0) : '0';
    lines.push(`| Cache hit rate | ${cmdHitRate}% |`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Render compact metrics summary (single line)
   * @returns {string}
   */
  renderCompact() {
    const report = this.tracker.getReport();

    const parts = [];

    // Cache hit rate
    let totalHits = 0;
    let totalOps = 0;
    for (const stats of Object.values(report.cache)) {
      totalHits += stats.hits;
      totalOps += stats.hits + stats.misses;
    }
    const hitRate = totalOps > 0 ? ((totalHits / totalOps) * 100).toFixed(0) : '0';
    parts.push(`Cache: ${hitRate}%`);

    // I/O
    parts.push(`I/O: ${report.fileIO.reads}r/${report.fileIO.writes}w`);

    // Memory
    const batchRatio = report.memory.batchedWrites + report.memory.immediateWrites > 0
      ? ((report.memory.batchedWrites / (report.memory.batchedWrites + report.memory.immediateWrites)) * 100).toFixed(0)
      : '0';
    parts.push(`Batch: ${batchRatio}%`);

    // Uptime
    parts.push(`Up: ${this._duration(report.sessionUptime)}`);

    return `[${parts.join(' | ')}]`;
  }

  /**
   * Render metrics as JSON (for programmatic use)
   * @returns {object}
   */
  renderJSON() {
    return this.tracker.getReport();
  }

  /**
   * Format bytes to human readable
   * @param {number} n - Bytes
   * @returns {string}
   */
  _bytes(n) {
    if (!n || n === 0) return '0B';
    if (n < 1024) return `${n}B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
    return `${(n / (1024 * 1024)).toFixed(1)}MB`;
  }

  /**
   * Format duration to human readable
   * @param {number} ms - Milliseconds
   * @returns {string}
   */
  _duration(ms) {
    if (!ms || ms === 0) return '0s';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}

module.exports = {
  MetricsDashboard,
};
