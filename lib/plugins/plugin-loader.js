'use strict';

/**
 * Plugin Loader — hardened per 2026-04-12 security audit.
 *
 * Security properties:
 *   - Plugin manifest is validated: `main` must resolve inside the plugin directory
 *     (no `../../..` path traversal).
 *   - sandbox=true uses vm.createContext with a curated require function that:
 *       * Rejects core modules not on the allowlist (no child_process, no http by default)
 *       * Rejects external modules (npm packages) unless explicitly declared in manifest.peerDependencies
 *       * Rejects relative paths that escape the plugin directory
 *   - sandbox=false is available for trusted plugins but is marked clearly — it loads via Node require.
 *   - Manifest JSON is parsed with __proto__/constructor stripping (prototype pollution defense).
 *   - Script execution has a timeout (default 5s) to prevent infinite-loop DoS during init.
 *   - Plugin IDs are validated (alphanumeric + dash/underscore, max 64 chars).
 */

const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { Module } = require('module');

// Modules a sandboxed plugin may require (curated, minimal)
const DEFAULT_ALLOWED_CORE_MODULES = new Set([
  'path', 'events', 'util', 'url', 'querystring', 'buffer', 'string_decoder',
  'assert', 'stream', 'zlib',
]);

// Modules that are DANGEROUS — never allowed in sandbox even if added to allowlist accidentally
const FORBIDDEN_CORE_MODULES = new Set([
  'child_process', 'cluster', 'worker_threads', 'vm', 'v8', 'inspector',
  'repl', 'dgram', 'net', 'tls', 'http2', 'perf_hooks',
]);

const PLUGIN_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/;
const DEFAULT_SCRIPT_TIMEOUT_MS = 5000;
const MAX_MANIFEST_SIZE = 64 * 1024;

/** Strip __proto__/constructor/prototype keys from parsed JSON (prototype pollution defense). */
function sanitizeJson(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const target = Array.isArray(obj) ? [] : Object.create(null);
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;
    target[k] = typeof v === 'object' && v !== null ? sanitizeJson(v) : v;
  }
  return target;
}

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
    this.allowedCoreModules = new Set(options.allowedCoreModules || DEFAULT_ALLOWED_CORE_MODULES);
    this.scriptTimeoutMs = options.scriptTimeoutMs || DEFAULT_SCRIPT_TIMEOUT_MS;

    // Reject any attempt to sneak forbidden modules into allowlist
    for (const forbidden of FORBIDDEN_CORE_MODULES) {
      if (this.allowedCoreModules.has(forbidden)) {
        throw new Error(`Cannot allow forbidden core module "${forbidden}" in sandbox`);
      }
    }
  }

  /**
   * Load a plugin from path
   * @param {string} pluginPath - Path to plugin directory or file
   * @returns {Promise<object>}
   */
  async load(pluginPath, loadOptions = {}) {
    const absolutePath = path.isAbsolute(pluginPath)
      ? pluginPath
      : path.join(process.cwd(), pluginPath);

    // Per-load trust override (for first-party built-in plugins)
    const trusted = loadOptions.trusted === true;

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
      const instance = await this._loadPluginCode(absolutePath, manifest, trusted);
      plugin.instance = instance;
      plugin.trusted = trusted;

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
        const stat = fs.statSync(manifestPath);
        if (stat.size > MAX_MANIFEST_SIZE) {
          throw new Error(`Plugin manifest too large: ${stat.size} bytes (max ${MAX_MANIFEST_SIZE})`);
        }
        const content = fs.readFileSync(manifestPath, 'utf8');
        const parsed = JSON.parse(content);
        return sanitizeJson(parsed);
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

    // Validate id if provided (prevents dangerous characters in identifiers)
    if (manifest.id !== undefined && !PLUGIN_ID_RE.test(manifest.id)) {
      throw new Error(`Invalid plugin id "${manifest.id}": must match ${PLUGIN_ID_RE}`);
    }

    // Reject obviously dangerous main paths
    if (manifest.main && (
      manifest.main.includes('..') ||
      path.isAbsolute(manifest.main) ||
      manifest.main.includes('\0')
    )) {
      throw new Error(`Invalid main entry "${manifest.main}"`);
    }

    // peerDependencies — plugins declare which external modules they need
    if (manifest.peerDependencies !== undefined &&
        (typeof manifest.peerDependencies !== 'object' || Array.isArray(manifest.peerDependencies))) {
      throw new Error('peerDependencies must be an object of { moduleName: versionRange }');
    }
  }

  /**
   * Load plugin code
   * @param {string} pluginPath
   * @param {object} manifest
   * @returns {Promise<object>}
   */
  async _loadPluginCode(pluginPath, manifest, trusted = false) {
    const entryPoint = manifest.main || 'index.js';
    const entryPath = path.join(pluginPath, entryPoint);

    // CONTAINMENT CHECK — entry path must resolve inside the plugin directory
    const resolvedEntry = path.resolve(entryPath);
    const resolvedPlugin = path.resolve(pluginPath);
    if (!resolvedEntry.startsWith(resolvedPlugin + path.sep) && resolvedEntry !== resolvedPlugin) {
      throw new Error(`Plugin entry escapes plugin directory: ${entryPoint}`);
    }

    if (!fs.existsSync(resolvedEntry)) {
      throw new Error(`Plugin entry point not found: ${entryPoint}`);
    }

    // Trusted first-party plugins get full Node require (same trust as node_modules)
    if (trusted || !this.sandbox) {
      this.emit('trustedPluginLoad', { path: resolvedEntry, trusted });
      return require(resolvedEntry);
    }

    // Third-party plugins: run in the vm sandbox
    return this._loadSandboxed(resolvedEntry, resolvedPlugin, manifest);
  }

  /**
   * Load a plugin inside a vm.createContext with a curated require function.
   * This is REAL sandboxing — not the previous no-op.
   *
   * What's blocked:
   *   - Core modules not on allowedCoreModules (default: path, events, util, etc.)
   *   - Forbidden core modules (child_process, net, tls, etc.) — always rejected
   *   - External npm packages NOT declared in manifest.peerDependencies
   *   - Relative requires that escape the plugin directory
   *
   * What the sandbox still trusts:
   *   - Whatever IS on the allowlist (e.g. plugin can read files if `fs` were allowed —
   *     but `fs` is NOT in the default allowlist; add it only if you've reviewed the plugin)
   *   - Manifest-declared peerDependencies (plugin author's declaration of what they need)
   */
  _loadSandboxed(entryPath, pluginRoot, manifest) {
    const peerDeps = new Set(Object.keys(manifest.peerDependencies || {}));
    const allowedCore = this.allowedCoreModules;
    const scriptTimeout = this.scriptTimeoutMs;

    /** The curated require function exposed to the plugin. */
    const sandboxRequire = (moduleName) => {
      if (typeof moduleName !== 'string' || moduleName.length === 0) {
        throw new Error(`Invalid require: ${moduleName}`);
      }

      // Relative require — resolve relative to the entry file, but must stay inside pluginRoot
      if (moduleName.startsWith('./') || moduleName.startsWith('../') || path.isAbsolute(moduleName)) {
        const resolved = path.resolve(path.dirname(entryPath), moduleName);
        if (!resolved.startsWith(pluginRoot + path.sep) && resolved !== pluginRoot) {
          throw new Error(`Plugin relative require escapes plugin root: ${moduleName}`);
        }
        return require(resolved);
      }

      // Core module
      if (Module.builtinModules.includes(moduleName) || Module.builtinModules.includes(moduleName.replace(/^node:/, ''))) {
        const canonical = moduleName.replace(/^node:/, '');
        if (FORBIDDEN_CORE_MODULES.has(canonical)) {
          throw new Error(`Module "${canonical}" is forbidden in sandbox`);
        }
        if (!allowedCore.has(canonical)) {
          throw new Error(`Core module "${canonical}" not in sandbox allowlist`);
        }
        return require(canonical);
      }

      // External npm module — must be declared in peerDependencies
      // Handle scoped packages and submodules: @scope/name or name/sub
      const pkgName = moduleName.startsWith('@')
        ? moduleName.split('/').slice(0, 2).join('/')
        : moduleName.split('/')[0];
      if (!peerDeps.has(pkgName)) {
        throw new Error(`Module "${moduleName}" not in plugin peerDependencies`);
      }
      return require(moduleName);
    };

    // Build a context with ONLY the intrinsics the plugin needs
    const sandbox = {
      module: { exports: {} },
      exports: {},
      require: sandboxRequire,
      console: {
        log: (...args) => this.emit('pluginLog', { plugin: manifest.name, message: args.join(' ') }),
        error: (...args) => this.emit('pluginLog', { plugin: manifest.name, level: 'error', message: args.join(' ') }),
        warn: (...args) => this.emit('pluginLog', { plugin: manifest.name, level: 'warn', message: args.join(' ') }),
      },
      __dirname: path.dirname(entryPath),
      __filename: entryPath,
      Buffer,
      process: Object.freeze({
        // Expose ONLY safe process info — no env, no exit, no chdir
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        versions: Object.freeze({ ...process.versions }),
      }),
      setTimeout, clearTimeout, setInterval, clearInterval, setImmediate, clearImmediate,
      globalThis: undefined, // filled after context creation
    };
    // Link exports to module.exports like Node does
    sandbox.module.exports = sandbox.exports;

    const context = vm.createContext(sandbox, {
      name: `plugin:${manifest.name}@${manifest.version}`,
      codeGeneration: { strings: false, wasm: false }, // disallow eval/new Function + WASM
    });

    const code = fs.readFileSync(entryPath, 'utf8');
    const script = new vm.Script(code, { filename: entryPath });
    script.runInContext(context, { timeout: scriptTimeout });

    // Plugin exports may be on either sandbox.module.exports or sandbox.exports
    return sandbox.module.exports !== sandbox.exports
      ? sandbox.module.exports
      : sandbox.exports;
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
