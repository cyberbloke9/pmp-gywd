'use strict';

/**
 * mem-search command
 * Search claude-mem observations
 *
 * Usage: /gywd:mem-search <query> [--type TYPE] [--limit N] [--project NAME]
 */

/**
 * Parse command arguments
 * @param {Object|string} args - Command arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs(args) {
  if (typeof args === 'string') {
    const parts = args.split(' ');
    const query = [];
    const options = {};

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part === '--type' && parts[i + 1]) {
        options.type = parts[++i];
      } else if (part === '--limit' && parts[i + 1]) {
        options.limit = parseInt(parts[++i], 10);
      } else if (part === '--project' && parts[i + 1]) {
        options.project = parts[++i];
      } else if (!part.startsWith('--')) {
        query.push(part);
      }
    }

    return {
      query: query.join(' '),
      ...options
    };
  }

  return args || {};
}

/**
 * Format search results for display
 * @param {Object} results - Search results from claude-mem API
 * @returns {string} - Formatted output
 */
function formatResults(results) {
  if (!results || !results.results || results.results.length === 0) {
    return 'No results found.';
  }

  const lines = [
    `## Search Results (${results.count} found)`,
    ''
  ];

  for (const result of results.results) {
    const date = new Date(result.created_at_epoch).toLocaleDateString();
    const type = result.type || 'observation';

    lines.push(`### #${result.id} - ${result.title || 'Untitled'}`);
    lines.push(`**Type:** ${type} | **Project:** ${result.project || 'unknown'} | **Date:** ${date}`);

    if (result.subtitle) {
      lines.push(`> ${result.subtitle}`);
    }

    lines.push('');
  }

  lines.push(`---`);
  lines.push(`*Query: "${results.query}" | Limit: ${results.limit}*`);

  return lines.join('\n');
}

/**
 * Execute mem-search command
 * @param {Object} args - Command arguments
 * @param {Object} plugin - Plugin instance
 * @returns {Object} - Command result
 */
async function memSearch(args, plugin) {
  const parsed = parseArgs(args);

  if (!parsed.query) {
    return {
      success: false,
      message: 'Usage: /gywd:mem-search <query> [--type TYPE] [--limit N] [--project NAME]'
    };
  }

  try {
    const results = await plugin.search(parsed.query, {
      type: parsed.type,
      limit: parsed.limit || 20,
      project: parsed.project
    });

    return {
      success: true,
      output: formatResults(results),
      data: results
    };
  } catch (error) {
    return {
      success: false,
      message: `Search failed: ${error.message}`
    };
  }
}

module.exports = { memSearch, parseArgs, formatResults };
