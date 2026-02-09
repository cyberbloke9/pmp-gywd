'use strict';

const { BaseAdapter, MODEL_PRICING, MODEL_CAPABILITIES } = require('../../lib/models/base-adapter');

describe('BaseAdapter', () => {
  test('cannot be instantiated directly', () => {
    expect(() => new BaseAdapter('test')).toThrow('abstract');
  });

  test('can be subclassed', () => {
    class TestAdapter extends BaseAdapter {
      constructor() { super('test', {}); }
    }
    const adapter = new TestAdapter();
    expect(adapter.getProvider()).toBe('test');
    expect(adapter.isAvailable()).toBe(false);
  });

  test('stores config values', () => {
    class TestAdapter extends BaseAdapter {
      constructor(config) { super('test', config); }
    }
    const adapter = new TestAdapter({
      apiKey: 'sk-test',
      baseUrl: 'https://custom.api',
      timeout: 60000,
      maxRetries: 5,
    });
    expect(adapter.apiKey).toBe('sk-test');
    expect(adapter.baseUrl).toBe('https://custom.api');
    expect(adapter.timeout).toBe(60000);
    expect(adapter.maxRetries).toBe(5);
  });

  test('uses default config values', () => {
    class TestAdapter extends BaseAdapter {
      constructor() { super('test'); }
    }
    const adapter = new TestAdapter();
    expect(adapter.timeout).toBe(30000);
    expect(adapter.maxRetries).toBe(2);
    expect(adapter.apiKey).toBeNull();
  });

  test('abstract methods throw', async () => {
    class TestAdapter extends BaseAdapter {
      constructor() { super('test', {}); }
    }
    const adapter = new TestAdapter();
    await expect(adapter.complete({})).rejects.toThrow('must implement complete()');
    await expect(adapter.checkAvailability()).rejects.toThrow('must implement checkAvailability()');
    expect(() => adapter.getModels()).toThrow('must implement getModels()');
  });

  test('_buildResponse creates standardized response', () => {
    class TestAdapter extends BaseAdapter {
      constructor() { super('test', {}); }
      buildResp(params) { return this._buildResponse(params); }
    }
    const adapter = new TestAdapter();
    const resp = adapter.buildResp({
      text: 'Hello',
      model: 'test-model',
      usage: { promptTokens: 10, completionTokens: 20 },
      latencyMs: 150,
      metadata: { custom: true },
    });

    expect(resp.text).toBe('Hello');
    expect(resp.provider).toBe('test');
    expect(resp.model).toBe('test-model');
    expect(resp.usage.promptTokens).toBe(10);
    expect(resp.usage.completionTokens).toBe(20);
    expect(resp.usage.totalTokens).toBe(30);
    expect(resp.latencyMs).toBe(150);
    expect(resp.metadata.custom).toBe(true);
    expect(resp.timestamp).toBeDefined();
  });

  test('_buildMessages from prompt and system', () => {
    class TestAdapter extends BaseAdapter {
      constructor() { super('test', {}); }
      buildMsgs(req) { return this._buildMessages(req); }
    }
    const adapter = new TestAdapter();

    // With prompt and system
    const msgs = adapter.buildMsgs({ prompt: 'Hello', system: 'Be helpful' });
    expect(msgs).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hello' },
    ]);

    // With messages array (takes priority)
    const msgs2 = adapter.buildMsgs({
      messages: [{ role: 'user', content: 'Hi' }],
      prompt: 'ignored',
    });
    expect(msgs2).toEqual([{ role: 'user', content: 'Hi' }]);

    // Prompt only
    const msgs3 = adapter.buildMsgs({ prompt: 'Just this' });
    expect(msgs3).toEqual([{ role: 'user', content: 'Just this' }]);
  });

  test('estimateCost calculates correctly', () => {
    class TestAdapter extends BaseAdapter {
      constructor() { super('test', {}); }
    }
    const adapter = new TestAdapter();

    // gpt-4o: $2.5/M input, $10/M output
    // 1000 input tokens = 1000/1000000 * 2.5 = 0.0025
    // 500 output tokens = 500/1000000 * 10.0 = 0.005
    const cost = adapter.estimateCost('gpt-4o', 1000, 500);
    expect(cost).toBeCloseTo(0.0025 + 0.005);

    // Unknown model uses default pricing
    const cost2 = adapter.estimateCost('unknown-model', 1000000, 1000000);
    expect(cost2).toBeCloseTo(1.0 + 3.0);
  });
});

describe('MODEL_PRICING', () => {
  test('has pricing for all major models', () => {
    const expectedModels = ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3', 'gemini-2.0-flash', 'llama3'];
    for (const model of expectedModels) {
      expect(MODEL_PRICING[model]).toBeDefined();
      expect(MODEL_PRICING[model].input).toBeDefined();
      expect(MODEL_PRICING[model].output).toBeDefined();
    }
  });

  test('local models are free', () => {
    expect(MODEL_PRICING['llama3'].input).toBe(0);
    expect(MODEL_PRICING['llama3'].output).toBe(0);
    expect(MODEL_PRICING['mistral'].input).toBe(0);
  });

  test('has _default fallback', () => {
    expect(MODEL_PRICING._default).toBeDefined();
  });
});

describe('MODEL_CAPABILITIES', () => {
  test('has capabilities for major models', () => {
    const expectedModels = ['gpt-4o', 'claude-opus-4-6', 'gemini-2.0-flash', 'llama3'];
    for (const model of expectedModels) {
      const caps = MODEL_CAPABILITIES[model];
      expect(caps).toBeDefined();
      expect(caps.provider).toBeDefined();
      expect(caps.maxContext).toBeGreaterThan(0);
      expect(caps.capabilities).toBeInstanceOf(Array);
      expect(caps.tier).toBeDefined();
      expect(caps.latencyClass).toBeDefined();
    }
  });

  test('premium models have reasoning capability', () => {
    expect(MODEL_CAPABILITIES['claude-opus-4-6'].capabilities).toContain('reasoning');
    expect(MODEL_CAPABILITIES['o1'].capabilities).toContain('reasoning');
    expect(MODEL_CAPABILITIES['gpt-4o'].capabilities).toContain('reasoning');
  });

  test('all models have code capability', () => {
    for (const [, caps] of Object.entries(MODEL_CAPABILITIES)) {
      expect(caps.capabilities).toContain('code');
    }
  });
});
