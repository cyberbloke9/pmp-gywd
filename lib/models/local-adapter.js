'use strict';

const { BaseAdapter } = require('./base-adapter');

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3';

const LOCAL_MODELS = [
  'llama3', 'mistral', 'codellama', 'deepseek-r1', 'phi3', 'qwen2',
];

/**
 * Local Model Adapter
 *
 * Wraps Ollama (and compatible llama.cpp endpoints) with standardized
 * input/output matching the BaseAdapter interface.
 * Connects to locally-running models — zero cost, full privacy.
 */
class LocalAdapter extends BaseAdapter {
  /**
   * @param {object} [config={}]
   * @param {string} [config.baseUrl='http://localhost:11434'] - Ollama server URL
   * @param {string} [config.defaultModel='llama3'] - Default model
   * @param {string} [config.backend='ollama'] - Backend type: 'ollama' or 'llamacpp'
   */
  constructor(config = {}) {
    super('local', config);
    this.baseUrl = config.baseUrl || process.env.OLLAMA_HOST || DEFAULT_OLLAMA_URL;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
    this.backend = config.backend || 'ollama';
    /** @type {function|null} Injectable fetch for testing */
    this._fetch = config._fetch || null;
  }

  /**
   * @param {object} request
   * @returns {Promise<import('./base-adapter').ModelResponse>}
   */
  async complete(request) {
    if (this.backend === 'llamacpp') {
      return this._completeLlamaCpp(request);
    }
    return this._completeOllama(request);
  }

  /**
   * Complete using Ollama API
   * @private
   */
  async _completeOllama(request) {
    const model = request.model || this.defaultModel;
    const messages = this._buildMessages(request);
    const options = request.options || {};

    const body = {
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
      options: {},
    };

    if (options.temperature !== undefined) body.options.temperature = options.temperature;
    if (options.topP !== undefined) body.options.top_p = options.topP;
    if (options.maxTokens) body.options.num_predict = options.maxTokens;
    if (options.stop) body.options.stop = options.stop;

    const start = Date.now();
    const fetchFn = this._fetch || globalThis.fetch;

    const response = await fetchFn(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    return this._buildResponse({
      text: data.message?.content || '',
      model: data.model || model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
      },
      latencyMs,
      metadata: {
        totalDuration: data.total_duration,
        loadDuration: data.load_duration,
        evalDuration: data.eval_duration,
        backend: 'ollama',
      },
    });
  }

  /**
   * Complete using llama.cpp server API
   * @private
   */
  async _completeLlamaCpp(request) {
    const messages = this._buildMessages(request);
    const options = request.options || {};

    // llama.cpp uses /completion endpoint with a prompt string
    const prompt = messages.map(m => {
      if (m.role === 'system') return `[INST] <<SYS>>\n${m.content}\n<</SYS>> [/INST]`;
      if (m.role === 'user') return `[INST] ${m.content} [/INST]`;
      return m.content;
    }).join('\n');

    const body = {
      prompt,
      n_predict: options.maxTokens || 1024,
      temperature: options.temperature ?? 0.7,
      top_p: options.topP ?? 1.0,
      stream: false,
    };

    if (options.stop) body.stop = options.stop;

    const start = Date.now();
    const fetchFn = this._fetch || globalThis.fetch;

    const response = await fetchFn(`${this.baseUrl}/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`llama.cpp API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    return this._buildResponse({
      text: data.content || '',
      model: request.model || this.defaultModel,
      usage: {
        promptTokens: data.tokens_evaluated || 0,
        completionTokens: data.tokens_predicted || 0,
      },
      latencyMs,
      metadata: {
        timings: data.timings,
        backend: 'llamacpp',
      },
    });
  }

  /**
   * @returns {Promise<boolean>}
   */
  async checkAvailability() {
    try {
      const fetchFn = this._fetch || globalThis.fetch;
      const endpoint = this.backend === 'llamacpp' ? '/health' : '/api/tags';
      const response = await fetchFn(`${this.baseUrl}${endpoint}`, {
        signal: AbortSignal.timeout(3000),
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
    return [...LOCAL_MODELS];
  }

  /**
   * List models actually available on the local Ollama instance
   * @returns {Promise<string[]>}
   */
  async listInstalledModels() {
    try {
      const fetchFn = this._fetch || globalThis.fetch;
      const response = await fetchFn(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!response.ok) return [];
      const data = await response.json();
      return (data.models || []).map(m => m.name);
    } catch {
      return [];
    }
  }
}

module.exports = { LocalAdapter, LOCAL_MODELS };
