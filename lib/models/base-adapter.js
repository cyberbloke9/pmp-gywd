'use strict';

/**
 * Per-million-token pricing for known models
 * Prices as of early 2025
 */
const MODEL_PRICING = {
  // Claude
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-5-20250929': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'o1': { input: 15.0, output: 60.0 },
  'o3': { input: 10.0, output: 40.0 },
  'o3-mini': { input: 1.1, output: 4.4 },
  // Google
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.0-pro': { input: 1.25, output: 5.0 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  // Local (free)
  'llama3': { input: 0, output: 0 },
  'mistral': { input: 0, output: 0 },
  'codellama': { input: 0, output: 0 },
  'deepseek-r1': { input: 0, output: 0 },
  // Default fallback
  _default: { input: 1.0, output: 3.0 },
};

/**
 * Model capabilities metadata
 */
const MODEL_CAPABILITIES = {
  'claude-opus-4-6': {
    provider: 'anthropic', maxContext: 200000, maxOutput: 32000,
    capabilities: ['reasoning', 'code', 'analysis', 'creative', 'vision'],
    tier: 'premium', latencyClass: 'slow',
  },
  'claude-sonnet-4-5-20250929': {
    provider: 'anthropic', maxContext: 200000, maxOutput: 16000,
    capabilities: ['reasoning', 'code', 'analysis', 'creative', 'vision'],
    tier: 'standard', latencyClass: 'medium',
  },
  'claude-haiku-4-5-20251001': {
    provider: 'anthropic', maxContext: 200000, maxOutput: 8000,
    capabilities: ['code', 'analysis', 'classification'],
    tier: 'economy', latencyClass: 'fast',
  },
  'gpt-4o': {
    provider: 'openai', maxContext: 128000, maxOutput: 16384,
    capabilities: ['reasoning', 'code', 'analysis', 'creative', 'vision'],
    tier: 'standard', latencyClass: 'medium',
  },
  'gpt-4o-mini': {
    provider: 'openai', maxContext: 128000, maxOutput: 16384,
    capabilities: ['code', 'analysis', 'classification'],
    tier: 'economy', latencyClass: 'fast',
  },
  'o1': {
    provider: 'openai', maxContext: 200000, maxOutput: 100000,
    capabilities: ['reasoning', 'code', 'analysis', 'math'],
    tier: 'premium', latencyClass: 'slow',
  },
  'o3': {
    provider: 'openai', maxContext: 200000, maxOutput: 100000,
    capabilities: ['reasoning', 'code', 'analysis', 'math'],
    tier: 'premium', latencyClass: 'slow',
  },
  'o3-mini': {
    provider: 'openai', maxContext: 200000, maxOutput: 100000,
    capabilities: ['reasoning', 'code', 'math'],
    tier: 'standard', latencyClass: 'medium',
  },
  'gemini-2.0-flash': {
    provider: 'google', maxContext: 1048576, maxOutput: 8192,
    capabilities: ['code', 'analysis', 'classification'],
    tier: 'economy', latencyClass: 'fast',
  },
  'gemini-2.0-pro': {
    provider: 'google', maxContext: 2097152, maxOutput: 8192,
    capabilities: ['reasoning', 'code', 'analysis', 'creative', 'vision'],
    tier: 'standard', latencyClass: 'medium',
  },
  'gemini-1.5-pro': {
    provider: 'google', maxContext: 2097152, maxOutput: 8192,
    capabilities: ['reasoning', 'code', 'analysis', 'creative', 'vision'],
    tier: 'standard', latencyClass: 'medium',
  },
  'llama3': {
    provider: 'local', maxContext: 8192, maxOutput: 4096,
    capabilities: ['code', 'analysis'],
    tier: 'free', latencyClass: 'variable',
  },
  'mistral': {
    provider: 'local', maxContext: 32768, maxOutput: 4096,
    capabilities: ['code', 'analysis'],
    tier: 'free', latencyClass: 'variable',
  },
  'codellama': {
    provider: 'local', maxContext: 16384, maxOutput: 4096,
    capabilities: ['code'],
    tier: 'free', latencyClass: 'variable',
  },
  'deepseek-r1': {
    provider: 'local', maxContext: 65536, maxOutput: 8192,
    capabilities: ['reasoning', 'code', 'math'],
    tier: 'free', latencyClass: 'variable',
  },
};

/**
 * Base Model Adapter
 *
 * Abstract interface that all LLM provider adapters must implement.
 * Provides standardized input/output regardless of provider.
 */
class BaseAdapter {
  /**
   * @param {string} provider - Provider name (e.g. 'openai', 'google', 'local')
   * @param {object} [config={}]
   * @param {string} [config.apiKey] - API key for the provider
   * @param {string} [config.baseUrl] - Custom base URL
   * @param {number} [config.timeout=30000] - Request timeout in ms
   * @param {number} [config.maxRetries=2] - Max retry attempts
   */
  constructor(provider, config = {}) {
    if (new.target === BaseAdapter) {
      throw new Error('BaseAdapter is abstract and cannot be instantiated directly');
    }
    this.provider = provider;
    this.apiKey = config.apiKey || null;
    this.baseUrl = config.baseUrl || null;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 2;
    this._available = false;
  }

  /**
   * Complete a prompt and return a response
   * @param {object} request
   * @param {string} request.prompt - The user prompt
   * @param {string} [request.system] - System prompt
   * @param {Array<{ role: string, content: string }>} [request.messages] - Multi-turn messages
   * @param {string} [request.model] - Specific model to use
   * @param {object} [request.options]
   * @param {number} [request.options.temperature=0.7] - Sampling temperature
   * @param {number} [request.options.maxTokens=1024] - Max output tokens
   * @param {number} [request.options.topP=1.0] - Top-p sampling
   * @param {string[]} [request.options.stop] - Stop sequences
   * @returns {Promise<ModelResponse>}
   */
  async complete(_request) {
    throw new Error(`${this.provider} adapter must implement complete()`);
  }

  /**
   * Check if the adapter is configured and available
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    throw new Error(`${this.provider} adapter must implement checkAvailability()`);
  }

  /**
   * Get available models for this provider
   * @returns {string[]}
   */
  getModels() {
    throw new Error(`${this.provider} adapter must implement getModels()`);
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProvider() {
    return this.provider;
  }

  /**
   * Check if adapter is available (cached from last checkAvailability)
   * @returns {boolean}
   */
  isAvailable() {
    return this._available;
  }

  /**
   * Build a standardized response object
   * @param {object} params
   * @param {string} params.text - Response text
   * @param {string} params.model - Model used
   * @param {object} params.usage - Token usage
   * @param {number} params.usage.promptTokens - Input tokens
   * @param {number} params.usage.completionTokens - Output tokens
   * @param {number} params.latencyMs - Request latency in ms
   * @param {object} [params.metadata] - Additional provider-specific metadata
   * @returns {ModelResponse}
   */
  _buildResponse({ text, model, usage, latencyMs, metadata = {} }) {
    return {
      text,
      provider: this.provider,
      model,
      usage: {
        promptTokens: usage.promptTokens || 0,
        completionTokens: usage.completionTokens || 0,
        totalTokens: (usage.promptTokens || 0) + (usage.completionTokens || 0),
      },
      latencyMs,
      metadata,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build standardized messages array from request
   * @param {object} request
   * @returns {Array<{ role: string, content: string }>}
   */
  _buildMessages(request) {
    if (request.messages && request.messages.length > 0) {
      return request.messages;
    }
    const messages = [];
    if (request.system) {
      messages.push({ role: 'system', content: request.system });
    }
    if (request.prompt) {
      messages.push({ role: 'user', content: request.prompt });
    }
    return messages;
  }

  /**
   * Estimate cost for a completion
   * @param {string} model - Model name
   * @param {number} promptTokens - Input tokens
   * @param {number} completionTokens - Output tokens
   * @returns {number} Estimated cost in USD
   */
  estimateCost(model, promptTokens, completionTokens) {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING._default;
    return (promptTokens / 1000000) * pricing.input + (completionTokens / 1000000) * pricing.output;
  }
}

/**
 * @typedef {object} ModelResponse
 * @property {string} text - Response text
 * @property {string} provider - Provider name
 * @property {string} model - Model used
 * @property {{ promptTokens: number, completionTokens: number, totalTokens: number }} usage
 * @property {number} latencyMs - Request latency
 * @property {object} metadata - Provider-specific metadata
 * @property {string} timestamp - ISO timestamp
 */

module.exports = { BaseAdapter, MODEL_PRICING, MODEL_CAPABILITIES };
