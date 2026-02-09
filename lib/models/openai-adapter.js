'use strict';

const { BaseAdapter } = require('./base-adapter');

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o';

const OPENAI_MODELS = [
  'gpt-4o', 'gpt-4o-mini', 'o1', 'o3', 'o3-mini',
];

/**
 * OpenAI Adapter
 *
 * Wraps the OpenAI Chat Completions API with standardized
 * input/output matching the BaseAdapter interface.
 * Uses native fetch (Node 18+), zero external dependencies.
 */
class OpenAIAdapter extends BaseAdapter {
  /**
   * @param {object} [config={}]
   * @param {string} [config.apiKey] - OpenAI API key (or OPENAI_API_KEY env var)
   * @param {string} [config.baseUrl] - Custom base URL (for Azure OpenAI etc.)
   * @param {string} [config.defaultModel='gpt-4o'] - Default model
   * @param {string} [config.organization] - OpenAI organization ID
   */
  constructor(config = {}) {
    super('openai', config);
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || null;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
    this.organization = config.organization || process.env.OPENAI_ORG_ID || null;
    /** @type {function|null} Injectable fetch for testing */
    this._fetch = config._fetch || null;
  }

  /**
   * @param {object} request
   * @returns {Promise<import('./base-adapter').ModelResponse>}
   */
  async complete(request) {
    const model = request.model || this.defaultModel;
    const messages = this._buildMessages(request);
    const options = request.options || {};

    const isReasoningModel = model.startsWith('o1') || model.startsWith('o3');

    const body = {
      model,
      messages: this._formatMessages(messages, isReasoningModel),
      max_completion_tokens: options.maxTokens || 1024,
    };

    // Reasoning models don't support temperature/top_p/stop
    if (!isReasoningModel) {
      body.temperature = options.temperature ?? 0.7;
      if (options.topP !== undefined) body.top_p = options.topP;
      if (options.stop) body.stop = options.stop;
    }

    const start = Date.now();
    const fetchFn = this._fetch || globalThis.fetch;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetchFn(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return this._buildResponse({
      text: choice?.message?.content || '',
      model: data.model || model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
      },
      latencyMs,
      metadata: {
        finishReason: choice?.finish_reason || 'unknown',
        id: data.id,
      },
    });
  }

  /**
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    if (!this.apiKey) {
      this._available = false;
      return false;
    }
    try {
      const fetchFn = this._fetch || globalThis.fetch;
      const response = await fetchFn(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      this._available = response.ok;
    } catch {
      this._available = false;
    }
    return this._available;
  }

  /**
   * @returns {string[]}
   */
  getModels() {
    return [...OPENAI_MODELS];
  }

  /**
   * Format messages for OpenAI API
   * Reasoning models (o1/o3) use 'developer' role instead of 'system'
   * @private
   */
  _formatMessages(messages, isReasoningModel) {
    return messages.map(m => {
      if (m.role === 'system' && isReasoningModel) {
        return { role: 'developer', content: m.content };
      }
      return { role: m.role, content: m.content };
    });
  }
}

module.exports = { OpenAIAdapter, OPENAI_MODELS };
