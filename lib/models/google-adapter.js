'use strict';

const { BaseAdapter } = require('./base-adapter');

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-2.0-flash';

const GOOGLE_MODELS = [
  'gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro',
];

/**
 * Google Gemini Adapter
 *
 * Wraps the Google Generative Language API with standardized
 * input/output matching the BaseAdapter interface.
 * Uses native fetch (Node 18+), zero external dependencies.
 */
class GoogleAdapter extends BaseAdapter {
  /**
   * @param {object} [config={}]
   * @param {string} [config.apiKey] - Google API key (or GOOGLE_API_KEY env var)
   * @param {string} [config.baseUrl] - Custom base URL
   * @param {string} [config.defaultModel='gemini-2.0-flash'] - Default model
   */
  constructor(config = {}) {
    super('google', config);
    this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || null;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || DEFAULT_MODEL;
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

    const { systemInstruction, contents } = this._formatForGemini(messages);

    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens || 1024,
        topP: options.topP ?? 1.0,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    if (options.stop && options.stop.length > 0) {
      body.generationConfig.stopSequences = options.stop;
    }

    const start = Date.now();
    const fetchFn = this._fetch || globalThis.fetch;

    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;
    const response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeout),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map(p => p.text).join('') || '';

    return this._buildResponse({
      text,
      model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
      },
      latencyMs,
      metadata: {
        finishReason: candidate?.finishReason || 'unknown',
        safetyRatings: candidate?.safetyRatings || [],
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
      const url = `${this.baseUrl}/models?key=${this.apiKey}`;
      const response = await fetchFn(url, {
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
    return [...GOOGLE_MODELS];
  }

  /**
   * Convert standardized messages to Gemini format
   * @private
   */
  _formatForGemini(messages) {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = { parts: [{ text: msg.content }] };
      } else {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        contents.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    return { systemInstruction, contents };
  }
}

module.exports = { GoogleAdapter, GOOGLE_MODELS };
