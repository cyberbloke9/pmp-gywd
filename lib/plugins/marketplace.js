'use strict';

/**
 * Plugin Marketplace
 *
 * Discovery, installation, and versioning of plugins.
 * Part of Phase 38: Plugin Marketplace.
 */

const { EventEmitter } = require('events');

/**
 * Plugin categories
 */
const PLUGIN_CATEGORY = {
  PRODUCTIVITY: 'productivity',
  INTEGRATION: 'integration',
  ANALYTICS: 'analytics',
  THEME: 'theme',
  AGENT: 'agent',
  UTILITY: 'utility',
};

/**
 * Sort options
 */
const SORT_BY = {
  DOWNLOADS: 'downloads',
  RATING: 'rating',
  UPDATED: 'updated',
  NAME: 'name',
};

/**
 * Plugin Marketplace class
 */
class PluginMarketplace extends EventEmitter {
  constructor(options = {}) {
    super();

    this.registryUrl = options.registryUrl || 'https://plugins.gywd.dev';
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    this.installed = new Map();
  }

  /**
   * Search for plugins
   * @param {string} query
   * @param {object} options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this._getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    // Simulate API call
    await this._simulateNetwork(200);

    // Mock search results
    const results = this._getMockPlugins().filter(p => {
      const searchFields = `${p.name} ${p.description} ${p.keywords.join(' ')}`.toLowerCase();
      return searchFields.includes(query.toLowerCase());
    });

    // Apply filters
    if (options.category) {
      results.filter(p => p.category === options.category);
    }

    // Apply sorting
    this._sortResults(results, options.sortBy || SORT_BY.DOWNLOADS);

    // Apply pagination
    const page = options.page || 1;
    const perPage = options.perPage || 20;
    const start = (page - 1) * perPage;
    const paginatedResults = results.slice(start, start + perPage);

    const response = {
      query,
      total: results.length,
      page,
      perPage,
      results: paginatedResults,
    };

    this._setCache(cacheKey, response);
    return response;
  }

  /**
   * Get plugin details
   * @param {string} pluginId
   * @returns {Promise<object>}
   */
  async getPlugin(pluginId) {
    const cacheKey = `plugin:${pluginId}`;
    const cached = this._getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    await this._simulateNetwork(100);

    const plugin = this._getMockPlugins().find(p => p.id === pluginId);

    if (!plugin) {
      return null;
    }

    // Add detailed info
    const detailed = {
      ...plugin,
      readme: `# ${plugin.name}\n\n${plugin.description}\n\n## Installation\n\n\`\`\`bash\ngywd plugin install ${plugin.id}\n\`\`\``,
      changelog: this._generateChangelog(plugin),
      versions: this._generateVersions(plugin),
      dependencies: plugin.dependencies || [],
    };

    this._setCache(cacheKey, detailed);
    return detailed;
  }

  /**
   * Get featured plugins
   * @returns {Promise<Array>}
   */
  async getFeatured() {
    await this._simulateNetwork(100);

    return this._getMockPlugins()
      .filter(p => p.featured)
      .slice(0, 6);
  }

  /**
   * Get trending plugins
   * @returns {Promise<Array>}
   */
  async getTrending() {
    await this._simulateNetwork(100);

    return this._getMockPlugins()
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10);
  }

  /**
   * Get plugins by category
   * @param {string} category
   * @returns {Promise<Array>}
   */
  async getByCategory(category) {
    await this._simulateNetwork(100);

    return this._getMockPlugins()
      .filter(p => p.category === category)
      .sort((a, b) => b.downloads - a.downloads);
  }

  /**
   * Install a plugin
   * @param {string} pluginId
   * @param {string} version
   * @returns {Promise<object>}
   */
  async install(pluginId, version = 'latest') {
    this.emit('installStarted', { pluginId, version });

    await this._simulateNetwork(500);

    const plugin = await this.getPlugin(pluginId);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const installedVersion = version === 'latest' ? plugin.version : version;

    this.installed.set(pluginId, {
      id: pluginId,
      name: plugin.name,
      version: installedVersion,
      installedAt: Date.now(),
    });

    this.emit('installCompleted', { pluginId, version: installedVersion });

    return {
      success: true,
      pluginId,
      version: installedVersion,
      path: `.gywd/plugins/${pluginId}`,
    };
  }

  /**
   * Uninstall a plugin
   * @param {string} pluginId
   * @returns {Promise<boolean>}
   */
  async uninstall(pluginId) {
    if (!this.installed.has(pluginId)) {
      throw new Error(`Plugin not installed: ${pluginId}`);
    }

    this.emit('uninstallStarted', { pluginId });

    await this._simulateNetwork(200);

    this.installed.delete(pluginId);

    this.emit('uninstallCompleted', { pluginId });

    return true;
  }

  /**
   * Update a plugin
   * @param {string} pluginId
   * @returns {Promise<object>}
   */
  async update(pluginId) {
    const installed = this.installed.get(pluginId);

    if (!installed) {
      throw new Error(`Plugin not installed: ${pluginId}`);
    }

    const plugin = await this.getPlugin(pluginId);

    if (!plugin) {
      throw new Error(`Plugin not found in registry: ${pluginId}`);
    }

    if (installed.version === plugin.version) {
      return { updated: false, reason: 'Already at latest version' };
    }

    this.emit('updateStarted', {
      pluginId,
      from: installed.version,
      to: plugin.version,
    });

    await this._simulateNetwork(300);

    installed.version = plugin.version;
    installed.updatedAt = Date.now();

    this.emit('updateCompleted', { pluginId, version: plugin.version });

    return {
      updated: true,
      from: installed.version,
      to: plugin.version,
    };
  }

  /**
   * Check for updates
   * @returns {Promise<Array>}
   */
  async checkUpdates() {
    const updates = [];

    for (const [pluginId, installed] of this.installed) {
      const remote = await this.getPlugin(pluginId);

      if (remote && remote.version !== installed.version) {
        updates.push({
          pluginId,
          currentVersion: installed.version,
          latestVersion: remote.version,
        });
      }
    }

    return updates;
  }

  /**
   * Get installed plugins
   * @returns {Array}
   */
  getInstalled() {
    return Array.from(this.installed.values());
  }

  /**
   * Sort results
   * @param {Array} results
   * @param {string} sortBy
   */
  _sortResults(results, sortBy) {
    switch (sortBy) {
      case SORT_BY.DOWNLOADS:
        results.sort((a, b) => b.downloads - a.downloads);
        break;
      case SORT_BY.RATING:
        results.sort((a, b) => b.rating - a.rating);
        break;
      case SORT_BY.UPDATED:
        results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        break;
      case SORT_BY.NAME:
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
  }

  /**
   * Get mock plugins
   * @returns {Array}
   */
  _getMockPlugins() {
    return [
      {
        id: 'gywd-github',
        name: 'GitHub Integration',
        description: 'Sync GYWD projects with GitHub issues and PRs',
        version: '2.1.0',
        author: 'GYWD Team',
        category: PLUGIN_CATEGORY.INTEGRATION,
        downloads: 15234,
        rating: 4.8,
        featured: true,
        keywords: ['github', 'git', 'sync', 'issues', 'pr'],
        updatedAt: '2026-01-15',
      },
      {
        id: 'gywd-jira',
        name: 'Jira Connector',
        description: 'Connect GYWD to Jira for enterprise project management',
        version: '1.5.2',
        author: 'Enterprise Tools',
        category: PLUGIN_CATEGORY.INTEGRATION,
        downloads: 8721,
        rating: 4.5,
        featured: true,
        keywords: ['jira', 'enterprise', 'tickets', 'agile'],
        updatedAt: '2026-01-10',
      },
      {
        id: 'gywd-metrics',
        name: 'Advanced Metrics',
        description: 'Detailed project metrics and velocity tracking',
        version: '3.0.0',
        author: 'Analytics Inc',
        category: PLUGIN_CATEGORY.ANALYTICS,
        downloads: 12456,
        rating: 4.9,
        featured: true,
        keywords: ['metrics', 'velocity', 'analytics', 'dashboard'],
        updatedAt: '2026-01-20',
      },
      {
        id: 'gywd-dark-theme',
        name: 'Dark Theme',
        description: 'Beautiful dark theme for GYWD dashboard',
        version: '1.2.0',
        author: 'Theme Maker',
        category: PLUGIN_CATEGORY.THEME,
        downloads: 5432,
        rating: 4.7,
        featured: false,
        keywords: ['theme', 'dark', 'ui', 'design'],
        updatedAt: '2025-12-01',
      },
      {
        id: 'gywd-ai-reviewer',
        name: 'AI Code Reviewer',
        description: 'AI-powered code review agent',
        version: '1.0.0',
        author: 'AI Labs',
        category: PLUGIN_CATEGORY.AGENT,
        downloads: 7890,
        rating: 4.6,
        featured: true,
        keywords: ['ai', 'review', 'code', 'agent'],
        updatedAt: '2026-01-25',
      },
      {
        id: 'gywd-notifications',
        name: 'Smart Notifications',
        description: 'Intelligent notification system with filtering',
        version: '2.0.1',
        author: 'Notify Inc',
        category: PLUGIN_CATEGORY.UTILITY,
        downloads: 9876,
        rating: 4.4,
        featured: false,
        keywords: ['notifications', 'alerts', 'slack', 'email'],
        updatedAt: '2026-01-18',
      },
    ];
  }

  /**
   * Generate changelog for plugin
   * @param {object} plugin
   * @returns {Array}
   */
  _generateChangelog(plugin) {
    return [
      {
        version: plugin.version,
        date: plugin.updatedAt,
        changes: ['Bug fixes and performance improvements'],
      },
      {
        version: '1.0.0',
        date: '2025-06-01',
        changes: ['Initial release'],
      },
    ];
  }

  /**
   * Generate versions list
   * @param {object} plugin
   * @returns {Array}
   */
  _generateVersions(plugin) {
    return [
      { version: plugin.version, date: plugin.updatedAt, latest: true },
      { version: '1.0.0', date: '2025-06-01', latest: false },
    ];
  }

  /**
   * Get from cache
   * @param {string} key
   * @returns {any}
   */
  _getFromCache(key) {
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    return null;
  }

  /**
   * Set cache
   * @param {string} key
   * @param {any} data
   */
  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Simulate network delay
   * @param {number} ms
   * @returns {Promise}
   */
  _simulateNetwork(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get marketplace status
   * @returns {object}
   */
  getStatus() {
    return {
      registryUrl: this.registryUrl,
      installedCount: this.installed.size,
      cacheSize: this.cache.size,
    };
  }
}

module.exports = {
  PluginMarketplace,
  PLUGIN_CATEGORY,
  SORT_BY,
};
