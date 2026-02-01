'use strict';

/**
 * Hook Manager
 *
 * Pre/post command hooks and lifecycle event system.
 * Part of Phase 25: Hooks System.
 */

/**
 * Hook types
 */
const HOOK_TYPES = {
  PRE_COMMAND: 'pre_command',
  POST_COMMAND: 'post_command',
  PRE_TASK: 'pre_task',
  POST_TASK: 'post_task',
  ON_ERROR: 'on_error',
  ON_SUCCESS: 'on_success',
  PRE_COMMIT: 'pre_commit',
  POST_COMMIT: 'post_commit',
};

/**
 * HookManager class
 */
class HookManager {
  constructor() {
    this.hooks = new Map();
    this.enabled = true;

    // Initialize hook arrays for each type
    for (const type of Object.values(HOOK_TYPES)) {
      this.hooks.set(type, []);
    }
  }

  /**
   * Register a hook
   * @param {string} type - Hook type from HOOK_TYPES
   * @param {Function} handler - Hook handler function
   * @param {object} options - Hook options
   * @returns {string} Hook ID for removal
   */
  register(type, handler, options = {}) {
    if (!this.hooks.has(type)) {
      throw new Error(`Unknown hook type: ${type}`);
    }

    const id = `hook_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const hook = {
      id,
      type,
      handler,
      priority: options.priority || 0,
      name: options.name || 'anonymous',
      once: options.once || false,
      pattern: options.pattern || null, // Command pattern to match
    };

    const hooks = this.hooks.get(type);
    hooks.push(hook);

    // Sort by priority (higher first)
    hooks.sort((a, b) => b.priority - a.priority);

    return id;
  }

  /**
   * Unregister a hook by ID
   * @param {string} id - Hook ID
   * @returns {boolean} True if removed
   */
  unregister(id) {
    for (const [type, hooks] of this.hooks) {
      const index = hooks.findIndex(h => h.id === id);
      if (index !== -1) {
        hooks.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  /**
   * Trigger hooks of a specific type
   * @param {string} type - Hook type
   * @param {object} context - Context to pass to handlers
   * @returns {Promise<object>} Aggregated results
   */
  async trigger(type, context = {}) {
    if (!this.enabled) {
      return { skipped: true, reason: 'Hooks disabled' };
    }

    const hooks = this.hooks.get(type) || [];
    const results = [];
    const toRemove = [];

    for (const hook of hooks) {
      // Check pattern match
      if (hook.pattern && context.command) {
        const regex = new RegExp(hook.pattern);
        if (!regex.test(context.command)) {
          continue;
        }
      }

      try {
        const result = await hook.handler(context);
        results.push({
          id: hook.id,
          name: hook.name,
          success: true,
          result,
        });

        // Track once hooks for removal
        if (hook.once) {
          toRemove.push(hook.id);
        }

        // Check if hook wants to stop propagation
        if (result && result.stopPropagation) {
          break;
        }
      } catch (error) {
        results.push({
          id: hook.id,
          name: hook.name,
          success: false,
          error: error.message,
        });

        // Check if hook wants to abort on error
        if (error.abort) {
          return {
            type,
            aborted: true,
            error: error.message,
            results,
          };
        }
      }
    }

    // Remove once hooks
    for (const id of toRemove) {
      this.unregister(id);
    }

    return {
      type,
      triggered: hooks.length,
      executed: results.length,
      results,
    };
  }

  /**
   * Shorthand for pre-command hooks
   * @param {Function} handler
   * @param {object} options
   */
  beforeCommand(handler, options = {}) {
    return this.register(HOOK_TYPES.PRE_COMMAND, handler, options);
  }

  /**
   * Shorthand for post-command hooks
   * @param {Function} handler
   * @param {object} options
   */
  afterCommand(handler, options = {}) {
    return this.register(HOOK_TYPES.POST_COMMAND, handler, options);
  }

  /**
   * Shorthand for error hooks
   * @param {Function} handler
   * @param {object} options
   */
  onError(handler, options = {}) {
    return this.register(HOOK_TYPES.ON_ERROR, handler, options);
  }

  /**
   * Shorthand for success hooks
   * @param {Function} handler
   * @param {object} options
   */
  onSuccess(handler, options = {}) {
    return this.register(HOOK_TYPES.ON_SUCCESS, handler, options);
  }

  /**
   * Enable hooks
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable hooks
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Clear all hooks of a type
   * @param {string} type - Hook type
   */
  clear(type) {
    if (type) {
      this.hooks.set(type, []);
    } else {
      for (const t of this.hooks.keys()) {
        this.hooks.set(t, []);
      }
    }
  }

  /**
   * Get statistics
   * @returns {object}
   */
  getStats() {
    const stats = {};
    for (const [type, hooks] of this.hooks) {
      stats[type] = hooks.length;
    }
    return {
      enabled: this.enabled,
      hooks: stats,
      total: Array.from(this.hooks.values()).reduce((a, b) => a + b.length, 0),
    };
  }

  /**
   * List all registered hooks
   * @returns {object[]}
   */
  list() {
    const all = [];
    for (const [type, hooks] of this.hooks) {
      for (const hook of hooks) {
        all.push({
          id: hook.id,
          type,
          name: hook.name,
          priority: hook.priority,
          once: hook.once,
          pattern: hook.pattern,
        });
      }
    }
    return all;
  }
}

// Singleton instance
const hookManager = new HookManager();

module.exports = {
  HookManager,
  hookManager,
  HOOK_TYPES,
};
