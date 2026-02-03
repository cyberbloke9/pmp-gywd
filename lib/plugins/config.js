'use strict';

/**
 * Plugin Configuration
 *
 * Defines which plugins are enabled and their settings.
 */

const path = require('path');

/**
 * Base path for built-in plugins
 */
const PLUGIN_BASE_PATH = path.join(__dirname);

/**
 * Enabled plugins configuration
 *
 * Each entry specifies:
 * - id: Unique plugin identifier
 * - path: Path to the plugin directory
 * - enabled: Whether the plugin should be loaded
 * - autoActivate: Whether to activate after loading (default: true)
 */
const ENABLED_PLUGINS = [
  {
    id: 'claude-mem-integration',
    path: path.join(PLUGIN_BASE_PATH, 'claude-mem-integration'),
    enabled: true,
    autoActivate: true,
    description: 'Real-time integration with claude-mem persistent memory system',
  },
];

/**
 * Get all enabled plugins
 * @returns {Array}
 */
function getEnabledPlugins() {
  return ENABLED_PLUGINS.filter(p => p.enabled);
}

/**
 * Get plugin config by ID
 * @param {string} id
 * @returns {object|null}
 */
function getPluginConfig(id) {
  return ENABLED_PLUGINS.find(p => p.id === id) || null;
}

/**
 * Check if a plugin is enabled
 * @param {string} id
 * @returns {boolean}
 */
function isPluginEnabled(id) {
  const config = getPluginConfig(id);
  return config?.enabled === true;
}

module.exports = {
  ENABLED_PLUGINS,
  PLUGIN_BASE_PATH,
  getEnabledPlugins,
  getPluginConfig,
  isPluginEnabled,
};
