'use strict';

/**
 * GYWD Plugin System
 *
 * Plugin loading, management, and marketplace integration.
 */

const { PluginLoader, PLUGIN_STATE, PLUGIN_TYPE } = require('./plugin-loader');
const { PluginMarketplace, PLUGIN_CATEGORY, SORT_BY } = require('./marketplace');
const {
  ENABLED_PLUGINS,
  PLUGIN_BASE_PATH,
  getEnabledPlugins,
  getPluginConfig,
  isPluginEnabled,
} = require('./config');
const {
  initPluginSystem,
  getPluginLoader,
  shutdownPluginSystem,
  executePluginCommand,
  executePluginHooks,
  getPluginSystemStatus,
} = require('./bootstrap');

module.exports = {
  // Plugin Loader (Phase 37)
  PluginLoader,
  PLUGIN_STATE,
  PLUGIN_TYPE,

  // Marketplace (Phase 38)
  PluginMarketplace,
  PLUGIN_CATEGORY,
  SORT_BY,

  // Plugin Configuration
  ENABLED_PLUGINS,
  PLUGIN_BASE_PATH,
  getEnabledPlugins,
  getPluginConfig,
  isPluginEnabled,

  // Plugin Bootstrap
  initPluginSystem,
  getPluginLoader,
  shutdownPluginSystem,
  executePluginCommand,
  executePluginHooks,
  getPluginSystemStatus,
};
