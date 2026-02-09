'use strict';

const { MODEL_CAPABILITIES, MODEL_PRICING } = require('./base-adapter');

/**
 * Model Router
 *
 * Selects the best model for a task based on cost, capability,
 * latency requirements, and available adapters. Supports
 * fallback chains and budget constraints.
 */
class ModelRouter {
  /**
   * @param {object} [config={}]
   * @param {object} [config.adapters={}] - Map of provider → adapter instance
   * @param {number} [config.maxCostPerRequest=0.05] - Max $ per request
   * @param {string} [config.defaultStrategy='balanced'] - 'cheapest' | 'fastest' | 'best' | 'balanced'
   * @param {Array<string>} [config.fallbackChain] - Ordered fallback models
   * @param {object} [config.taskRoutes={}] - Task type → preferred model mapping
   */
  constructor(config = {}) {
    /** @type {Map<string, import('./base-adapter').BaseAdapter>} */
    this.adapters = new Map();
    this.maxCostPerRequest = config.maxCostPerRequest || 0.05;
    this.defaultStrategy = config.defaultStrategy || 'balanced';
    this.fallbackChain = config.fallbackChain || [];
    this.taskRoutes = config.taskRoutes || {};

    // Register provided adapters
    if (config.adapters) {
      for (const [provider, adapter] of Object.entries(config.adapters)) {
        this.adapters.set(provider, adapter);
      }
    }

    /** @type {Map<string, { totalCost: number, totalLatency: number, count: number }>} */
    this._stats = new Map();
  }

  /**
   * Register an adapter
   * @param {import('./base-adapter').BaseAdapter} adapter
   * @returns {ModelRouter} this
   */
  registerAdapter(adapter) {
    this.adapters.set(adapter.getProvider(), adapter);
    return this;
  }

  /**
   * Route a request to the best available model
   * @param {object} request - Standard completion request
   * @param {object} [routeOptions]
   * @param {string} [routeOptions.taskType] - e.g. 'code', 'analysis', 'classification'
   * @param {string} [routeOptions.strategy] - Override default strategy
   * @param {string[]} [routeOptions.requiredCapabilities] - Model must have these
   * @param {number} [routeOptions.maxCost] - Override max cost
   * @returns {Promise<import('./base-adapter').ModelResponse>}
   */
  async route(request, routeOptions = {}) {
    const model = this.selectModel(routeOptions);

    if (!model) {
      throw new Error('No suitable model found for the given requirements');
    }

    // Find the adapter for this model
    const capabilities = MODEL_CAPABILITIES[model];
    if (!capabilities) {
      throw new Error(`Unknown model: ${model}`);
    }

    const adapter = this.adapters.get(capabilities.provider);
    if (!adapter) {
      throw new Error(`No adapter registered for provider: ${capabilities.provider}`);
    }

    // Execute with the selected model
    const response = await adapter.complete({ ...request, model });

    // Track stats
    this._trackStats(model, response);

    return response;
  }

  /**
   * Select the best model based on strategy and requirements
   * @param {object} [options]
   * @param {string} [options.taskType] - Task type for route lookup
   * @param {string} [options.strategy] - Selection strategy
   * @param {string[]} [options.requiredCapabilities] - Required model capabilities
   * @param {number} [options.maxCost] - Max cost per million tokens (input)
   * @returns {string|null} Model name or null if none suitable
   */
  selectModel(options = {}) {
    const strategy = options.strategy || this.defaultStrategy;

    // Check task-specific routes first
    if (options.taskType && this.taskRoutes[options.taskType]) {
      const routed = this.taskRoutes[options.taskType];
      if (this._isModelAvailable(routed)) {
        return routed;
      }
    }

    // Get all candidate models from registered adapters
    const candidates = this._getCandidates(options);

    if (candidates.length === 0) {
      // Try fallback chain
      return this._tryFallback();
    }

    // Apply strategy
    switch (strategy) {
      case 'cheapest':
        return this._selectCheapest(candidates);
      case 'fastest':
        return this._selectFastest(candidates);
      case 'best':
        return this._selectBest(candidates);
      case 'balanced':
      default:
        return this._selectBalanced(candidates);
    }
  }

  /**
   * Execute with fallback chain
   * @param {object} request
   * @param {object} [routeOptions]
   * @returns {Promise<import('./base-adapter').ModelResponse>}
   */
  async routeWithFallback(request, routeOptions = {}) {
    const errors = [];

    // Try primary selection
    try {
      return await this.route(request, routeOptions);
    } catch (err) {
      errors.push(err);
    }

    // Try fallback chain
    for (const model of this.fallbackChain) {
      const capabilities = MODEL_CAPABILITIES[model];
      if (!capabilities) continue;

      const adapter = this.adapters.get(capabilities.provider);
      if (!adapter) continue;

      try {
        const response = await adapter.complete({ ...request, model });
        this._trackStats(model, response);
        return response;
      } catch (err) {
        errors.push(err);
      }
    }

    throw new Error(`All models failed. Errors: ${errors.map(e => e.message).join('; ')}`);
  }

  /**
   * Get routing stats
   * @returns {object}
   */
  getStats() {
    const stats = {};
    for (const [model, data] of this._stats) {
      stats[model] = {
        requests: data.count,
        totalCost: Math.round(data.totalCost * 10000) / 10000,
        avgLatencyMs: data.count > 0 ? Math.round(data.totalLatency / data.count) : 0,
      };
    }
    return stats;
  }

  /**
   * Reset stats
   */
  resetStats() {
    this._stats.clear();
  }

  /**
   * Get all available models across all adapters
   * @returns {string[]}
   */
  getAvailableModels() {
    const models = [];
    for (const adapter of this.adapters.values()) {
      models.push(...adapter.getModels());
    }
    return models;
  }

  /**
   * Get registered adapters
   * @returns {string[]} Provider names
   */
  getRegisteredProviders() {
    return [...this.adapters.keys()];
  }

  /**
   * Estimate cost for a request
   * @param {string} model
   * @param {number} estimatedInputTokens
   * @param {number} estimatedOutputTokens
   * @returns {{ cost: number, model: string, pricing: object }}
   */
  estimateCost(model, estimatedInputTokens, estimatedOutputTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING._default;
    const cost = (estimatedInputTokens / 1000000) * pricing.input +
                 (estimatedOutputTokens / 1000000) * pricing.output;
    return { cost: Math.round(cost * 10000) / 10000, model, pricing };
  }

  // ---- Private methods ----

  /**
   * Get candidate models that meet requirements
   * @private
   */
  _getCandidates(options = {}) {
    const allModels = this.getAvailableModels();
    const maxCost = options.maxCost || this.maxCostPerRequest;
    const required = options.requiredCapabilities || [];

    return allModels.filter(model => {
      const caps = MODEL_CAPABILITIES[model];
      if (!caps) return false;

      // Check required capabilities
      if (required.length > 0) {
        const hasAll = required.every(c => caps.capabilities.includes(c));
        if (!hasAll) return false;
      }

      // Check cost constraint (estimate 1000 input tokens as baseline)
      const pricing = MODEL_PRICING[model] || MODEL_PRICING._default;
      const estimatedCost = (1000 / 1000000) * pricing.input;
      if (estimatedCost > maxCost && caps.tier !== 'free') return false;

      return true;
    });
  }

  /**
   * Select cheapest model
   * @private
   */
  _selectCheapest(candidates) {
    return candidates.sort((a, b) => {
      const pa = MODEL_PRICING[a] || MODEL_PRICING._default;
      const pb = MODEL_PRICING[b] || MODEL_PRICING._default;
      return (pa.input + pa.output) - (pb.input + pb.output);
    })[0] || null;
  }

  /**
   * Select fastest model (by latency class)
   * @private
   */
  _selectFastest(candidates) {
    const latencyOrder = { fast: 0, medium: 1, variable: 2, slow: 3 };
    return candidates.sort((a, b) => {
      const la = MODEL_CAPABILITIES[a]?.latencyClass || 'slow';
      const lb = MODEL_CAPABILITIES[b]?.latencyClass || 'slow';
      return (latencyOrder[la] || 3) - (latencyOrder[lb] || 3);
    })[0] || null;
  }

  /**
   * Select best (most capable) model
   * @private
   */
  _selectBest(candidates) {
    const tierOrder = { premium: 0, standard: 1, economy: 2, free: 3 };
    return candidates.sort((a, b) => {
      const ta = MODEL_CAPABILITIES[a]?.tier || 'economy';
      const tb = MODEL_CAPABILITIES[b]?.tier || 'economy';
      const tierDiff = (tierOrder[ta] || 2) - (tierOrder[tb] || 2);
      if (tierDiff !== 0) return tierDiff;
      // Within same tier, prefer more capabilities
      const ca = MODEL_CAPABILITIES[a]?.capabilities?.length || 0;
      const cb = MODEL_CAPABILITIES[b]?.capabilities?.length || 0;
      return cb - ca;
    })[0] || null;
  }

  /**
   * Select balanced model (good capability at reasonable cost)
   * @private
   */
  _selectBalanced(candidates) {
    // Score each model: lower is better
    // Score = costRank * 0.4 + latencyRank * 0.3 + (1 - capabilityRank) * 0.3
    const scored = candidates.map(model => {
      const pricing = MODEL_PRICING[model] || MODEL_PRICING._default;
      const caps = MODEL_CAPABILITIES[model] || {};
      const latencyOrder = { fast: 1, medium: 2, variable: 3, slow: 4 };

      const costScore = (pricing.input + pricing.output) / 100; // Normalize
      const latencyScore = latencyOrder[caps.latencyClass] || 3;
      const capScore = (caps.capabilities?.length || 0) / 5; // Normalize to ~1

      const score = costScore * 0.4 + latencyScore * 0.3 - capScore * 0.3;
      return { model, score };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored[0]?.model || null;
  }

  /**
   * Try fallback chain
   * @private
   */
  _tryFallback() {
    for (const model of this.fallbackChain) {
      if (this._isModelAvailable(model)) {
        return model;
      }
    }
    return null;
  }

  /**
   * Check if a model's provider adapter is registered
   * @private
   */
  _isModelAvailable(model) {
    const caps = MODEL_CAPABILITIES[model];
    return caps && this.adapters.has(caps.provider);
  }

  /**
   * Track usage stats
   * @private
   */
  _trackStats(model, response) {
    if (!this._stats.has(model)) {
      this._stats.set(model, { totalCost: 0, totalLatency: 0, count: 0 });
    }
    const stats = this._stats.get(model);
    const pricing = MODEL_PRICING[model] || MODEL_PRICING._default;
    const cost = (response.usage.promptTokens / 1000000) * pricing.input +
                 (response.usage.completionTokens / 1000000) * pricing.output;
    stats.totalCost += cost;
    stats.totalLatency += response.latencyMs;
    stats.count++;
  }
}

module.exports = { ModelRouter };
