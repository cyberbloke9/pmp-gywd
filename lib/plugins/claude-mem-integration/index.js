'use strict';

/**
 * Claude-Mem Integration Plugin for PMP-GYWD
 *
 * Real-time streaming integration with claude-mem persistent memory system.
 * Imports observations as GYWD patterns, enables cross-session learning.
 *
 * @module claude-mem-integration
 */

const { SSEClient } = require('./sse-client');
const { ObservationMapper } = require('./observation-mapper');
const { SyncManager } = require('./sync-manager');

// Import GYWD core modules
const { GlobalMemory, PatternAggregator, FeedbackCollector, ConfidenceCalibrator } = require('../../memory');

/**
 * Plugin state enumeration
 */
const PLUGIN_STATUS = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error'
};

/**
 * Claude-Mem Integration Plugin
 */
class ClaudeMemIntegrationPlugin {
  constructor() {
    this.pluginAPI = null;
    this.config = null;
    this.status = PLUGIN_STATUS.DISCONNECTED;

    // Core components
    this.sseClient = null;
    this.mapper = null;
    this.syncManager = null;

    // GYWD modules
    this.globalMemory = null;
    this.aggregator = null;
    this.feedback = null;
    this.calibrator = null;

    // Stats
    this.stats = {
      observationsReceived: 0,
      patternsImported: 0,
      errors: 0,
      lastSync: null,
      connectedAt: null
    };
  }

  /**
   * Initialize the plugin
   * Called by PluginLoader after instantiation
   *
   * @param {Object} pluginAPI - Plugin API provided by PluginLoader
   */
  async init(pluginAPI) {
    this.pluginAPI = pluginAPI;
    this.config = pluginAPI.getConfig();

    pluginAPI.log('Initializing claude-mem integration plugin...');

    // Initialize GYWD memory modules
    this.globalMemory = new GlobalMemory();
    this.globalMemory.init();

    this.aggregator = new PatternAggregator(this.globalMemory);
    this.aggregator.init();

    this.feedback = new FeedbackCollector();
    this.feedback.init();

    this.calibrator = new ConfidenceCalibrator();
    this.calibrator.init();

    // Initialize plugin components
    this.mapper = new ObservationMapper({
      initialConfidence: this.config.initialConfidence || 0.6
    });

    this.syncManager = new SyncManager({
      globalMemory: this.globalMemory,
      batchSize: this.config.syncBatchSize || 100,
      syncInterval: this.config.syncIntervalMs || 30000,
      maxQueueSize: this.config.maxQueueSize || 10000
    });

    // Initialize SSE client
    this.sseClient = new SSEClient({
      host: this.config.workerHost || '127.0.0.1',
      port: this.config.workerPort || 37777,
      maxReconnectAttempts: this.config.reconnectMaxAttempts || 10,
      baseReconnectDelay: this.config.reconnectBaseDelayMs || 1000
    });

    // Wire up SSE events
    this._setupSSEHandlers();

    // Register commands
    this._registerCommands(pluginAPI);

    // Register hooks
    this._registerHooks(pluginAPI);

    // Auto-connect if configured
    if (this.config.autoConnect !== false) {
      await this.connect();
    }

    pluginAPI.log('Claude-mem integration plugin initialized');

    return this;
  }

  /**
   * Setup SSE event handlers
   * @private
   */
  _setupSSEHandlers() {
    this.sseClient.on('connected', () => {
      this.status = PLUGIN_STATUS.CONNECTED;
      this.stats.connectedAt = new Date().toISOString();
      this.pluginAPI?.log('Connected to claude-mem worker');
    });

    this.sseClient.on('disconnected', () => {
      this.status = PLUGIN_STATUS.DISCONNECTED;
      this.pluginAPI?.log('Disconnected from claude-mem worker');
    });

    this.sseClient.on('reconnecting', (attempt) => {
      this.status = PLUGIN_STATUS.CONNECTING;
      this.pluginAPI?.log(`Reconnecting to claude-mem worker (attempt ${attempt})`);
    });

    this.sseClient.on('error', (error) => {
      this.status = PLUGIN_STATUS.ERROR;
      this.stats.errors++;
      this.pluginAPI?.log(`SSE error: ${error.message}`);
    });

    this.sseClient.on('observation_queued', async (data) => {
      this.stats.observationsReceived++;
      await this._handleObservation(data);
    });

    this.sseClient.on('session_completed', (data) => {
      // Trigger a sync flush when session completes
      this.syncManager.flush();
    });

    this.sseClient.on('processing_status', (data) => {
      // Update internal status tracking
      this.stats.processingStatus = data;
    });
  }

  /**
   * Handle incoming observation from SSE
   * @private
   */
  async _handleObservation(data) {
    try {
      // Fetch full observation details
      const observation = await this._fetchObservation(data.sessionDbId);

      if (observation) {
        // Map to GYWD pattern
        const pattern = this.mapper.toPattern(observation);

        // Queue for batch import
        this.syncManager.queue(pattern);
        this.stats.patternsImported++;
      }
    } catch (error) {
      this.stats.errors++;
      this.pluginAPI?.log(`Error handling observation: ${error.message}`);
    }
  }

  /**
   * Fetch observation details from claude-mem API
   * @private
   */
  async _fetchObservation(sessionDbId) {
    const baseUrl = `http://${this.config.workerHost}:${this.config.workerPort}`;
    const timeout = this.config.requestTimeoutMs || 10000;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${baseUrl}/api/session/${sessionDbId}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Register plugin commands
   * @private
   */
  _registerCommands(pluginAPI) {
    // mem-search command
    pluginAPI.registerCommand('mem-search', async (args) => {
      const { memSearch } = require('./commands/mem-search');
      return memSearch(args, this);
    }, {
      description: 'Search claude-mem observations',
      usage: '/gywd:mem-search <query> [--type TYPE] [--limit N] [--project NAME]'
    });

    // mem-sync command
    pluginAPI.registerCommand('mem-sync', async (args) => {
      const { memSync } = require('./commands/mem-sync');
      return memSync(args, this);
    }, {
      description: 'Manually sync claude-mem observations',
      usage: '/gywd:mem-sync [--full] [--since DATE]'
    });

    // mem-status command
    pluginAPI.registerCommand('mem-status', async (args) => {
      const { memStatus } = require('./commands/mem-status');
      return memStatus(args, this);
    }, {
      description: 'Show claude-mem integration status',
      usage: '/gywd:mem-status'
    });

    // mem-timeline command
    pluginAPI.registerCommand('mem-timeline', async (args) => {
      const { memTimeline } = require('./commands/mem-timeline');
      return memTimeline(args, this);
    }, {
      description: 'Show claude-mem observation timeline',
      usage: '/gywd:mem-timeline [--anchor ID] [--query QUERY] [--depth N]'
    });
  }

  /**
   * Register plugin hooks
   * @private
   */
  _registerHooks(pluginAPI) {
    // Track GYWD command executions
    pluginAPI.registerHook('post_command', async (context) => {
      // Could be used to track GYWD command patterns
      return context;
    }, { priority: 10, name: 'claude-mem-post-command' });

    // Inject context before tasks
    pluginAPI.registerHook('pre_task', async (context) => {
      // Could inject relevant claude-mem context
      return context;
    }, { priority: 10, name: 'claude-mem-pre-task' });

    // Track errors
    pluginAPI.registerHook('on_error', async (context) => {
      // Could track error patterns
      return context;
    }, { priority: 10, name: 'claude-mem-on-error' });
  }

  /**
   * Connect to claude-mem worker
   */
  async connect() {
    if (this.status === PLUGIN_STATUS.CONNECTED) {
      return { success: true, message: 'Already connected' };
    }

    this.status = PLUGIN_STATUS.CONNECTING;

    try {
      // Check worker health first
      const healthy = await this._checkWorkerHealth();

      if (!healthy) {
        this.status = PLUGIN_STATUS.ERROR;
        return { success: false, message: 'Claude-mem worker not available' };
      }

      // Connect SSE client
      await this.sseClient.connect();

      // Start sync manager
      this.syncManager.start();

      return { success: true, message: 'Connected to claude-mem worker' };
    } catch (error) {
      this.status = PLUGIN_STATUS.ERROR;
      this.stats.errors++;
      return { success: false, message: error.message };
    }
  }

  /**
   * Disconnect from claude-mem worker
   */
  async disconnect() {
    this.sseClient.disconnect();
    this.syncManager.stop();
    this.status = PLUGIN_STATUS.DISCONNECTED;

    return { success: true, message: 'Disconnected from claude-mem worker' };
  }

  /**
   * Check if claude-mem worker is healthy
   * @private
   */
  async _checkWorkerHealth() {
    const baseUrl = `http://${this.config.workerHost}:${this.config.workerPort}`;

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get plugin status
   */
  getStatus() {
    return {
      status: this.status,
      stats: { ...this.stats },
      syncManagerStats: this.syncManager?.getStats() || {},
      config: {
        workerHost: this.config?.workerHost,
        workerPort: this.config?.workerPort,
        autoConnect: this.config?.autoConnect
      }
    };
  }

  /**
   * Search claude-mem observations
   */
  async search(query, options = {}) {
    const baseUrl = `http://${this.config.workerHost}:${this.config.workerPort}`;
    const params = new URLSearchParams({ query, ...options });

    const response = await fetch(`${baseUrl}/api/search?${params}`);

    if (!response.ok) {
      throw new Error(`Search failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get timeline from claude-mem
   */
  async getTimeline(options = {}) {
    const baseUrl = `http://${this.config.workerHost}:${this.config.workerPort}`;
    const params = new URLSearchParams(options);

    const response = await fetch(`${baseUrl}/api/timeline?${params}`);

    if (!response.ok) {
      throw new Error(`Timeline failed: HTTP ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get aggregated patterns from GYWD
   */
  getPatterns(options = {}) {
    const { level = 'moderate', type } = options;

    if (type) {
      return this.aggregator.getPatternsByType(type);
    }

    return this.aggregator.getConsensusPatterns(level);
  }

  /**
   * Cleanup when plugin is unloaded
   * Called by PluginLoader
   */
  async cleanup() {
    this.pluginAPI?.log('Cleaning up claude-mem integration plugin...');

    // Disconnect SSE
    await this.disconnect();

    // Flush any pending syncs
    if (this.syncManager) {
      await this.syncManager.flush();
      this.syncManager.stop();
    }

    // Save memory state
    if (this.globalMemory) {
      this.globalMemory.flush();
    }

    this.pluginAPI?.log('Claude-mem integration plugin cleanup complete');
  }
}

// Export singleton instance
module.exports = new ClaudeMemIntegrationPlugin();

// Also export class for testing
module.exports.ClaudeMemIntegrationPlugin = ClaudeMemIntegrationPlugin;
module.exports.PLUGIN_STATUS = PLUGIN_STATUS;
