'use strict';

/**
 * Plugin Bootstrap
 *
 * Initializes the plugin system and loads enabled plugins.
 */

const { PluginLoader, PLUGIN_STATE } = require('./plugin-loader');
const { getEnabledPlugins } = require('./config');

/**
 * Global plugin loader instance
 */
let pluginLoader = null;

/**
 * Initialize the plugin system
 * @param {object} options
 * @returns {Promise<PluginLoader>}
 */
async function initPluginSystem(options = {}) {
  if (pluginLoader && !options.force) {
    return { loader: pluginLoader, results: { loaded: [], failed: [], alreadyInitialized: true } };
  }

  pluginLoader = new PluginLoader({
    pluginDir: options.pluginDir,
    sandbox: options.sandbox !== false,
  });

  // Set up event handlers
  pluginLoader.on('pluginLoaded', ({ id, name }) => {
    if (options.verbose) {
      console.log(`[GYWD Plugin] Loaded: ${name} (${id})`);
    }
  });

  pluginLoader.on('pluginError', ({ path, error }) => {
    console.error(`[GYWD Plugin] Error loading ${path}: ${error}`);
  });

  pluginLoader.on('pluginLog', ({ plugin, message }) => {
    if (options.verbose) {
      console.log(`[${plugin}] ${message}`);
    }
  });

  // Load enabled plugins
  const enabledPlugins = getEnabledPlugins();
  const results = {
    loaded: [],
    failed: [],
  };

  for (const pluginConfig of enabledPlugins) {
    try {
      const plugin = await pluginLoader.load(pluginConfig.path);

      // Auto-activate if configured
      if (pluginConfig.autoActivate !== false) {
        pluginLoader.enable(plugin.id);
      }

      results.loaded.push({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
      });
    } catch (error) {
      results.failed.push({
        id: pluginConfig.id,
        path: pluginConfig.path,
        error: error.message,
      });
    }
  }

  return { loader: pluginLoader, results };
}

/**
 * Get the plugin loader instance
 * @returns {PluginLoader|null}
 */
function getPluginLoader() {
  return pluginLoader;
}

/**
 * Shutdown the plugin system
 * @returns {Promise<void>}
 */
async function shutdownPluginSystem() {
  if (!pluginLoader) {
    return;
  }

  const plugins = pluginLoader.getPlugins();

  for (const plugin of plugins) {
    try {
      await pluginLoader.unload(plugin.id);
    } catch (error) {
      console.error(`[GYWD Plugin] Error unloading ${plugin.id}: ${error.message}`);
    }
  }

  pluginLoader = null;
}

/**
 * Execute a plugin command
 * @param {string} commandName - Full command name (plugin-id:command-name)
 * @param {object} args
 * @returns {Promise<any>}
 */
async function executePluginCommand(commandName, args = {}) {
  if (!pluginLoader) {
    throw new Error('Plugin system not initialized');
  }

  return pluginLoader.executeCommand(commandName, args);
}

/**
 * Execute plugin hooks
 * @param {string} hookName
 * @param {object} context
 * @returns {Promise<object>}
 */
async function executePluginHooks(hookName, context = {}) {
  if (!pluginLoader) {
    return context;
  }

  return pluginLoader.executeHooks(hookName, context);
}

/**
 * Get plugin system status
 * @returns {object}
 */
function getPluginSystemStatus() {
  if (!pluginLoader) {
    return {
      initialized: false,
      totalPlugins: 0,
      activePlugins: 0,
    };
  }

  return {
    initialized: true,
    ...pluginLoader.getStatus(),
    plugins: pluginLoader.getPlugins(),
    commands: pluginLoader.getCommands(),
  };
}

module.exports = {
  initPluginSystem,
  getPluginLoader,
  shutdownPluginSystem,
  executePluginCommand,
  executePluginHooks,
  getPluginSystemStatus,
};
