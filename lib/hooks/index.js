'use strict';

/**
 * GYWD Hooks
 *
 * Pre/post command hooks and lifecycle events.
 */

const { HookManager, hookManager, HOOK_TYPES } = require('./hook-manager');

module.exports = {
  HookManager,
  hookManager,
  HOOK_TYPES,
};
