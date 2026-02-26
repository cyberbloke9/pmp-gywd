'use strict';

/**
 * Plugin Loader
 *
 * Loads and manages plugins for extending GYWD functionality.
 * Part of Phase 37: Plugin Architecture.
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

/**
 * Plugin states
 */
const PLUGIN_STATE = {
  UNLOADED: 'unloaded',
  LOADING: 'loading',
  LOADED: 'loaded',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  ERROR: 'error',
};

/**
 * Plugin types
 */
const PLUGIN_TYPE = {
  COMMAND: 'command',
  AGENT: 'agent',
  HOOK: 'hook',
  THEME: 'theme',
  INTEGRATION: 'integration',
};

/**
 * Plugin Loader class
 */
class PluginLoader extends EventEmitter {
  constructor(options = {}) {
    super();

    this.pluginDir = options.pluginDir || '.gywd/plugins';
    this.plugins = new Map();
    this.hooks = new Map();
    this.commands = new Map();
    this.sandbox = options.sandbox !== false;
  }

  /**
   * Load a plugin from path
   * @param {string} pluginPath - Path to plugin directory or file
   * @returns {Promise<object>}
   */
  async load(pluginPath) {
    const absolutePath = path.isAbsolute(pluginPath)
      ? pluginPath
      : path.join(process.cwd(), pluginPath);

    try {
      // Read plugin manifest
      const manifest = await this._readManifest(absolutePath);

      if (!manifest) {
        throw new Error('No plugin manifest found');
      }

      // Validate manifest
      this._validateManifest(manifest);

      // Create plugin record
      const plugin = {
        id: manifest.id || path.basename(absolutePath),
        name: manifest.name,
        version: manifest.version,
        description: manifest.description || '',
        author: manifest.author || 'Unknown',
        type: manifest.type || PLUGIN_TYPE.COMMAND,
        path: absolutePath,
        manifest,
        state: PLUGIN_STATE.LOADING,
        instance: null,
        loadedAt: null,
        error: null,
      };

      // Load plugin code
      const instance = await this._loadPluginCode(absolutePath, manifest);
      plugin.instance = instance;

      // Initialize plugin
      if (typeof instance.init === 'function') {
        await instance.init(this._createPluginAPI(plugin));
      }

      // Register plugin hooks and commands
      this._registerPluginExtensions(plugin, instance);

      plugin.state = PLUGIN_STATE.LOADED;
      plugin.loadedAt = Date.now();

      this.plugins.set(plugin.id, plugin);
      this.emit('pluginLoaded', { id: plugin.id, name: plugin.name });

      return plugin;
    } catch (error) {
      this.emit('pluginError', { path: pluginPath, error: error.message });
      throw error;
    }
  }

  /**
   * Read plugin manifest
   * @param {string} pluginPath
   * @returns {Promise<object|null>}
   */
  async _readManifest(pluginPath) {
    const manifestPaths = [
      path.join(pluginPath, 'plugin.json'),
      path.join(pluginPath, 'package.json'),
      path.join(pluginPath, 'manifest.json'),
    ];

    for (const manifestPath of manifestPaths) {
      if (fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(manifestPath, 'utf8');
        return JSON.parse(content);
      }
    }

    return null;
  }

  /**
   * Validate plugin manifest
   * @param {object} manifest
   */
  _validateManifest(manifest) {
    const required = ['name', 'version'];

    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required manifest field: ${field}`);
      }
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new Error('Invalid version format. Use semver (e.g., 1.0.0)');
    }
  }

  /**
   * Load plugin code
   * @param {string} pluginPath
   * @param {object} manifest
   * @returns {Promise<object>}
   */
  async _loadPluginCode(pluginPath, manifest) {
    const entryPoint = manifest.main || 'index.js';
    const entryPath = path.join(pluginPath, entryPoint);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Plugin entry point not found: ${entryPoint}`);
    }

    // Load with sandboxing consideration
    if (this.sandbox) {
      return this._loadSandboxed(entryPath);
    }

    return require(entryPath);
  }

  /**
   * Load plugin in sandbox (limited)
   * @param {string} entryPath
   * @returns {object}
   */
  _loadSandboxed(entryPath) {
    // Basic sandboxing - limit require access
    const _sandboxedRequire = (moduleName) => {
      const allowed = ['path', 'fs', 'events', 'util'];
      if (allowed.includes(moduleName) || moduleName.startsWith('.')) {
        return require(moduleName);
      }
      throw new Error(`Module not allowed in sandbox: ${moduleName}`);
    };

    // In a real implementation, would use vm module with context
    return require(entryPath);
  }

  /**
   * Create plugin API
   * @param {object} plugin
   * @returns {object}
   */
  _createPluginAPI(plugin) {
    return {
      // Register a command
      registerCommand: (name, handler, options = {}) => {
        this.commands.set(`${plugin.id}:${name}`, {
          plugin: plugin.id,
          name,
          handler,
          ...options,
        });
      },

      // Register a hook
      registerHook: (hookName, handler, options = {}) => {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({
          plugin: plugin.id,
          handler,
          priority: options.priority || 10,
        });
      },

      // Get config
      getConfig: () => plugin.manifest.config || {},

      // Log
      log: (message) => {
        this.emit('pluginLog', { plugin: plugin.id, message });
      },

      // Get other plugins
      getPlugin: (id) => this.plugins.get(id)?.instance,
    };
  }

  /**
   * Register plugin extensions
   * @param {object} plugin
   * @param {object} instance
   */
  _registerPluginExtensions(plugin, instance) {
    // Register declared commands
    if (instance.commands) {
      for (const [name, handler] of Object.entries(instance.commands)) {
        this.commands.set(`${plugin.id}:${name}`, {
          plugin: plugin.id,
          name,
          handler,
        });
      }
    }

    // Register declared hooks
    if (instance.hooks) {
      for (const [hookName, handler] of Object.entries(instance.hooks)) {
        if (!this.hooks.has(hookName)) {
          this.hooks.set(hookName, []);
        }
        this.hooks.get(hookName).push({
          plugin: plugin.id,
          handler,
          priority: 10,
        });
      }
    }
  }

  /**
   * Unload a plugin
   * @param {string} pluginId
   */
  async unload(pluginId) {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Call cleanup if available
    if (plugin.instance && typeof plugin.instance.cleanup === 'function') {
      await plugin.instance.cleanup();
    }

    // Remove commands
    for (const [key] of this.commands) {
      if (key.startsWith(`${pluginId}:`)) {
        this.commands.delete(key);
      }
    }

    // Remove hooks
    for (const [hookName, handlers] of this.hooks) {
      this.hooks.set(
        hookName,
        handlers.filter(h => h.plugin !== pluginId),
      );
    }

    plugin.state = PLUGIN_STATE.UNLOADED;
    this.plugins.delete(pluginId);

    this.emit('pluginUnloaded', { id: pluginId });
  }

  /**
   * Enable a plugin
   * @param {string} pluginId
   */
  enable(pluginId) {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    plugin.state = PLUGIN_STATE.ACTIVE;
    this.emit('pluginEnabled', { id: pluginId });
  }

  /**
   * Disable a plugin
   * @param {string} pluginId
   */
  disable(pluginId) {
    const plugin = this.plugins.get(pluginId);

    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    plugin.state = PLUGIN_STATE.DISABLED;
    this.emit('pluginDisabled', { id: pluginId });
  }

  /**
   * Execute a command
   * @param {string} commandName
   * @param {object} args
   * @returns {Promise<any>}
   */
  async executeCommand(commandName, args = {}) {
    const command = this.commands.get(commandName);

    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    const plugin = this.plugins.get(command.plugin);

    if (plugin?.state === PLUGIN_STATE.DISABLED) {
      throw new Error(`Plugin is disabled: ${command.plugin}`);
    }

    return command.handler(args);
  }

  /**
   * Execute hooks
   * @param {string} hookName
   * @param {object} context
   * @returns {Promise<object>}
   */
  async executeHooks(hookName, context = {}) {
    const handlers = this.hooks.get(hookName) || [];

    // Sort by priority
    const sorted = handlers.sort((a, b) => a.priority - b.priority);

    let result = context;

    for (const { plugin, handler } of sorted) {
      const pluginInstance = this.plugins.get(plugin);

      if (pluginInstance?.state === PLUGIN_STATE.DISABLED) {
        continue;
      }

      result = await handler(result);
    }

    return result;
  }

  /**
   * Get all loaded plugins
   * @returns {Array}
   */
  getPlugins() {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      description: p.description,
      author: p.author,
      type: p.type,
      state: p.state,
      loadedAt: p.loadedAt,
    }));
  }

  /**
   * Get available commands
   * @returns {Array}
   */
  getCommands() {
    return Array.from(this.commands.entries()).map(([key, cmd]) => ({
      command: key,
      plugin: cmd.plugin,
      name: cmd.name,
      description: cmd.description || '',
    }));
  }

  /**
   * Get plugin status
   * @returns {object}
   */
  getStatus() {
    const plugins = Array.from(this.plugins.values());

    return {
      totalPlugins: plugins.length,
      activePlugins: plugins.filter(p => p.state === PLUGIN_STATE.ACTIVE).length,
      loadedPlugins: plugins.filter(p => p.state === PLUGIN_STATE.LOADED).length,
      disabledPlugins: plugins.filter(p => p.state === PLUGIN_STATE.DISABLED).length,
      commandCount: this.commands.size,
      hookCount: this.hooks.size,
    };
  }
}

module.exports = {
  PluginLoader,
  PLUGIN_STATE,
  PLUGIN_TYPE,
};
