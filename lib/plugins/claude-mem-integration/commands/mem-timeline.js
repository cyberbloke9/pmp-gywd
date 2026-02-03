'use strict';

/**
 * mem-timeline command
 * Show claude-mem observation timeline
 *
 * Usage: /gywd:mem-timeline [--anchor ID] [--query QUERY] [--depth N]
 */

/**
 * Parse command arguments
 * @param {Object|string} args - Command arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs(args) {
  if (typeof args === 'string') {
    const parts = args.split(' ');
    const options = {};

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part === '--anchor' && parts[i + 1]) {
        options.anchor = parseInt(parts[++i], 10);
      } else if (part === '--query' && parts[i + 1]) {
        options.query = parts[++i];
      } else if (part === '--depth' && parts[i + 1]) {
        options.depth_before = parseInt(parts[++i], 10);
        options.depth_after = options.depth_before;
      } else if (part === '--project' && parts[i + 1]) {
        options.project = parts[++i];
      }
    }

    return options;
  }

  return args || {};
}

/**
 * Format timeline results for display
 * @param {Object} results - Timeline results from claude-mem API
 * @returns {string} - Formatted output
 */
function formatTimeline(results) {
  if (!results || !results.results || results.results.length === 0) {
    return 'No timeline data found.';
  }

  const lines = [
    `## Timeline (${results.count} items)`,
    ''
  ];

  // Group by date
  const grouped = {};

  for (const item of results.results) {
    const date = new Date(item.created_at_epoch);
    const dateKey = date.toLocaleDateString();

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(item);
  }

  // Display by date
  for (const [date, items] of Object.entries(grouped)) {
    lines.push(`### ${date}`);
    lines.push('');

    for (const item of items) {
      const time = new Date(item.created_at_epoch).toLocaleTimeString();
      const typeIcon = getTypeIcon(item.type);

      lines.push(`${time} ${typeIcon} **#${item.id}** - ${item.title || 'Untitled'}`);

      if (item.project) {
        lines.push(`   📁 ${item.project}`);
      }
    }

    lines.push('');
  }

  lines.push('---');

  if (results.query) {
    lines.push(`*Query: "${results.query}"*`);
  }

  return lines.join('\n');
}

/**
 * Get icon for item type
 * @param {string} type - Item type
 * @returns {string} - Emoji icon
 */
function getTypeIcon(type) {
  const icons = {
    'observation': '🔵',
    'session': '📋',
    'prompt': '💬',
    'summary': '📝'
  };

  return icons[type] || '⚪';
}

/**
 * Execute mem-timeline command
 * @param {Object} args - Command arguments
 * @param {Object} plugin - Plugin instance
 * @returns {Object} - Command result
 */
async function memTimeline(args, plugin) {
  const parsed = parseArgs(args);

  // Set defaults
  if (!parsed.anchor && !parsed.query) {
    // Get recent timeline by default
    parsed.limit = 50;
  }

  if (!parsed.depth_before) {
    parsed.depth_before = 5;
  }

  if (!parsed.depth_after) {
    parsed.depth_after = 5;
  }

  try {
    const results = await plugin.getTimeline({
      anchor: parsed.anchor,
      query: parsed.query,
      depth_before: parsed.depth_before,
      depth_after: parsed.depth_after,
      project: parsed.project,
      limit: parsed.limit
    });

    return {
      success: true,
      output: formatTimeline(results),
      data: results
    };
  } catch (error) {
    return {
      success: false,
      message: `Timeline failed: ${error.message}`
    };
  }
}

module.exports = { memTimeline, parseArgs, formatTimeline };
