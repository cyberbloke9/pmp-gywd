'use strict';

/**
 * mem-sync command
 * Manually sync claude-mem observations to GYWD patterns
 *
 * Usage: /gywd:mem-sync [--full] [--since DATE]
 */

/**
 * Parse command arguments
 * @param {Object|string} args - Command arguments
 * @returns {Object} - Parsed arguments
 */
function parseArgs(args) {
  if (typeof args === 'string') {
    const parts = args.split(' ');
    const options = {
      full: false,
      since: null,
    };

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      if (part === '--full') {
        options.full = true;
      } else if (part === '--since' && parts[i + 1]) {
        options.since = parts[++i];
      }
    }

    return options;
  }

  return args || {};
}

/**
 * Format sync results for display
 * @param {Object} results - Sync results
 * @returns {string} - Formatted output
 */
function formatResults(results) {
  const lines = [
    `## Sync Results`,
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Observations fetched | ${results.fetched || 0} |`,
    `| Patterns imported | ${results.imported || 0} |`,
    `| Patterns merged | ${results.merged || 0} |`,
    `| Errors | ${results.errors || 0} |`,
    `| Duration | ${results.duration || 0}ms |`,
    '',
  ];

  if (results.errors > 0) {
    lines.push(`**Warning:** ${results.errors} error(s) occurred during sync.`);
    if (results.lastError) {
      lines.push(`Last error: ${results.lastError}`);
    }
  }

  lines.push('');
  lines.push(`*Synced at: ${new Date().toISOString()}*`);

  return lines.join('\n');
}

/**
 * Fetch observations from claude-mem
 * @param {Object} plugin - Plugin instance
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} - Observations
 */
async function fetchObservations(plugin, options) {
  const baseUrl = `http://${plugin.config.workerHost}:${plugin.config.workerPort}`;
  const params = new URLSearchParams({
    limit: options.full ? 10000 : 1000,
    orderBy: 'date_desc',
  });

  if (options.since) {
    params.append('dateStart', options.since);
  }

  const response = await fetch(`${baseUrl}/api/observations?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch observations: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.results || data || [];
}

/**
 * Execute mem-sync command
 * @param {Object} args - Command arguments
 * @param {Object} plugin - Plugin instance
 * @returns {Object} - Command result
 */
async function memSync(args, plugin) {
  const parsed = parseArgs(args);

  const startTime = Date.now();
  const results = {
    fetched: 0,
    imported: 0,
    merged: 0,
    errors: 0,
    lastError: null,
    duration: 0,
  };

  try {
    // Fetch observations from claude-mem
    const observations = await fetchObservations(plugin, parsed);
    results.fetched = observations.length;

    if (observations.length === 0) {
      results.duration = Date.now() - startTime;
      return {
        success: true,
        output: 'No observations to sync.',
        data: results,
      };
    }

    // Map to patterns
    const patterns = plugin.mapper.toPatterns(observations);

    // Aggregate patterns
    const aggregated = plugin.mapper.aggregate(patterns);

    // Import to GlobalMemory
    for (const pattern of aggregated) {
      try {
        const existing = plugin.globalMemory.getPatternsByType(pattern.type)
          .find(p => p.pattern === pattern.pattern);

        if (existing) {
          // Merge
          existing.occurrences = (existing.occurrences || 1) + pattern.occurrences;
          existing.confidence = Math.min(existing.confidence + 0.05, 0.95);
          results.merged++;
        } else {
          // New pattern
          plugin.globalMemory.recordPattern({
            type: pattern.type,
            pattern: pattern.pattern,
            confidence: pattern.confidence,
            source: pattern.sources?.[0] || 'claude-mem',
          });
          results.imported++;
        }
      } catch (error) {
        results.errors++;
        results.lastError = error.message;
      }
    }

    // Save to disk
    plugin.globalMemory.save();

    results.duration = Date.now() - startTime;

    return {
      success: true,
      output: formatResults(results),
      data: results,
    };

  } catch (error) {
    results.errors++;
    results.lastError = error.message;
    results.duration = Date.now() - startTime;

    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      data: results,
    };
  }
}

module.exports = { memSync, parseArgs, formatResults };
