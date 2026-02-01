'use strict';

/**
 * GYWD Plugin System
 *
 * Plugin loading, management, and marketplace integration.
 */

const { PluginLoader, PLUGIN_STATE, PLUGIN_TYPE } = require('./plugin-loader');
const { PluginMarketplace, PLUGIN_CATEGORY, SORT_BY } = require('./marketplace');

module.exports = {
  // Plugin Loader (Phase 37)
  PluginLoader,
  PLUGIN_STATE,
  PLUGIN_TYPE,

  // Marketplace (Phase 38)
  PluginMarketplace,
  PLUGIN_CATEGORY,
  SORT_BY,
};
