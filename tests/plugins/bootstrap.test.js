'use strict';

/**
 * Plugin Bootstrap Tests
 */

const {
  getEnabledPlugins,
  getPluginConfig,
  isPluginEnabled,
  ENABLED_PLUGINS,
} = require('../../lib/plugins/config');

const {
  initPluginSystem,
  getPluginLoader,
  shutdownPluginSystem,
  getPluginSystemStatus,
} = require('../../lib/plugins/bootstrap');

describe('Plugin Configuration', () => {
  describe('ENABLED_PLUGINS', () => {
    it('should include claude-mem-integration', () => {
      const claudeMem = ENABLED_PLUGINS.find(p => p.id === 'claude-mem-integration');
      expect(claudeMem).toBeDefined();
      expect(claudeMem.enabled).toBe(true);
    });
  });

  describe('getEnabledPlugins', () => {
    it('should return only enabled plugins', () => {
      const plugins = getEnabledPlugins();
      expect(plugins.every(p => p.enabled === true)).toBe(true);
    });

    it('should include claude-mem-integration', () => {
      const plugins = getEnabledPlugins();
      const claudeMem = plugins.find(p => p.id === 'claude-mem-integration');
      expect(claudeMem).toBeDefined();
    });
  });

  describe('getPluginConfig', () => {
    it('should return config for existing plugin', () => {
      const config = getPluginConfig('claude-mem-integration');
      expect(config).not.toBeNull();
      expect(config.id).toBe('claude-mem-integration');
    });

    it('should return null for non-existent plugin', () => {
      const config = getPluginConfig('non-existent');
      expect(config).toBeNull();
    });
  });

  describe('isPluginEnabled', () => {
    it('should return true for enabled plugin', () => {
      expect(isPluginEnabled('claude-mem-integration')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(isPluginEnabled('non-existent')).toBe(false);
    });
  });
});

describe('Plugin Bootstrap', () => {
  afterEach(async () => {
    await shutdownPluginSystem();
  });

  describe('getPluginSystemStatus (before init)', () => {
    it('should return uninitialized status', () => {
      const status = getPluginSystemStatus();
      expect(status.initialized).toBe(false);
      expect(status.totalPlugins).toBe(0);
    });
  });

  describe('getPluginLoader (before init)', () => {
    it('should return null before initialization', () => {
      expect(getPluginLoader()).toBeNull();
    });
  });

  describe('initPluginSystem', () => {
    it('should initialize plugin loader', async () => {
      const { loader, results } = await initPluginSystem({ verbose: false });

      expect(loader).toBeDefined();
      expect(results).toBeDefined();
      expect(results.loaded).toBeInstanceOf(Array);
      expect(results.failed).toBeInstanceOf(Array);
    });

    it('should load claude-mem-integration plugin', async () => {
      const { results } = await initPluginSystem({ verbose: false });

      const claudeMem = results.loaded.find(p => p.id === 'claude-mem-integration');
      expect(claudeMem).toBeDefined();
      expect(claudeMem.name).toBe('claude-mem-integration');
      expect(claudeMem.version).toBe('1.0.0');
    });

    it('should return existing loader if already initialized', async () => {
      const first = await initPluginSystem({ verbose: false });
      const second = await initPluginSystem({ verbose: false });

      expect(second.loader).toBe(first.loader);
    });

    it('should force re-initialization with force option', async () => {
      const first = await initPluginSystem({ verbose: false });
      const second = await initPluginSystem({ verbose: false, force: true });

      expect(second.loader).not.toBe(first.loader);
    });
  });

  describe('getPluginSystemStatus (after init)', () => {
    it('should return initialized status', async () => {
      await initPluginSystem({ verbose: false });
      const status = getPluginSystemStatus();

      expect(status.initialized).toBe(true);
      expect(status.totalPlugins).toBeGreaterThan(0);
      expect(status.plugins).toBeInstanceOf(Array);
      expect(status.commands).toBeInstanceOf(Array);
    });
  });

  describe('shutdownPluginSystem', () => {
    it('should unload all plugins', async () => {
      await initPluginSystem({ verbose: false });
      await shutdownPluginSystem();

      expect(getPluginLoader()).toBeNull();
      expect(getPluginSystemStatus().initialized).toBe(false);
    });

    it('should handle shutdown when not initialized', async () => {
      // Should not throw
      await expect(shutdownPluginSystem()).resolves.not.toThrow();
    });
  });
});
