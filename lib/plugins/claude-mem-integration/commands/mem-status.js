'use strict';

/**
 * mem-status command
 * Show claude-mem integration status
 *
 * Usage: /gywd:mem-status
 */

/**
 * Format status for display
 * @param {Object} status - Plugin status
 * @returns {string} - Formatted output
 */
function formatStatus(status) {
  const lines = [
    `## Claude-Mem Integration Status`,
    ''
  ];

  // Connection status
  const statusEmoji = {
    'connected': '🟢',
    'connecting': '🟡',
    'disconnected': '🔴',
    'error': '❌'
  };

  lines.push(`### Connection`);
  lines.push(`**Status:** ${statusEmoji[status.status] || '⚪'} ${status.status}`);
  lines.push(`**Worker:** ${status.config?.workerHost}:${status.config?.workerPort}`);

  if (status.stats?.connectedAt) {
    lines.push(`**Connected since:** ${status.stats.connectedAt}`);
  }

  lines.push('');

  // Sync statistics
  lines.push(`### Sync Statistics`);
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Observations received | ${status.stats?.observationsReceived || 0} |`);
  lines.push(`| Patterns imported | ${status.stats?.patternsImported || 0} |`);
  lines.push(`| Errors | ${status.stats?.errors || 0} |`);
  lines.push(`| Last sync | ${status.stats?.lastSync || 'Never'} |`);

  lines.push('');

  // Sync manager stats
  if (status.syncManagerStats) {
    lines.push(`### Queue Status`);
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Queue length | ${status.syncManagerStats.queueLength || 0} |`);
    lines.push(`| Total queued | ${status.syncManagerStats.queued || 0} |`);
    lines.push(`| Total synced | ${status.syncManagerStats.synced || 0} |`);
    lines.push(`| Dropped (overflow) | ${status.syncManagerStats.dropped || 0} |`);
    lines.push(`| Batches processed | ${status.syncManagerStats.batches || 0} |`);
    lines.push(`| Sync state | ${status.syncManagerStats.state || 'unknown'} |`);

    if (status.syncManagerStats.lastError) {
      lines.push('');
      lines.push(`**Last error:** ${status.syncManagerStats.lastError}`);
    }
  }

  lines.push('');

  // Pattern summary
  lines.push(`### Imported Patterns by Type`);
  lines.push('');

  if (status.patternsByType && Object.keys(status.patternsByType).length > 0) {
    lines.push(`| Type | Count |`);
    lines.push(`|------|-------|`);

    for (const [type, count] of Object.entries(status.patternsByType)) {
      lines.push(`| ${type} | ${count} |`);
    }
  } else {
    lines.push('No patterns imported yet.');
  }

  lines.push('');
  lines.push(`---`);
  lines.push(`*Status checked at: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

/**
 * Get pattern counts by type
 * @param {Object} plugin - Plugin instance
 * @returns {Object} - Counts by type
 */
function getPatternsByType(plugin) {
  if (!plugin.globalMemory) {
    return {};
  }

  const counts = {};

  // Get all pattern types from mapper
  const types = require('../observation-mapper').ObservationMapper.getPatternTypes();

  for (const type of types) {
    const patterns = plugin.globalMemory.getPatternsByType(type);
    if (patterns.length > 0) {
      counts[type] = patterns.length;
    }
  }

  return counts;
}

/**
 * Execute mem-status command
 * @param {Object} args - Command arguments (unused)
 * @param {Object} plugin - Plugin instance
 * @returns {Object} - Command result
 */
async function memStatus(args, plugin) {
  try {
    const status = plugin.getStatus();

    // Add pattern counts
    status.patternsByType = getPatternsByType(plugin);

    return {
      success: true,
      output: formatStatus(status),
      data: status
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to get status: ${error.message}`
    };
  }
}

module.exports = { memStatus, formatStatus, getPatternsByType };
