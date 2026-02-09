'use strict';

const { ModelRouter } = require('../../lib/models/model-router');
const { BaseAdapter } = require('../../lib/models/base-adapter');

/** Minimal adapter for testing the router */
class MockAdapter extends BaseAdapter {
  constructor(provider, models, completeFn) {
    super(provider, {});
    this._models = models;
    this._completeFn = completeFn || (async (req) => this._buildResponse({
      text: `Response from ${req.model || models[0]}`,
      model: req.model || models[0],
      usage: { promptTokens: 10, completionTokens: 5 },
      latencyMs: 100,
    }));
    this._available = true;
  }

  async complete(request) {
    return this._completeFn(request);
  }

  async checkAvailability() {
    this._available = true;
    return true;
  }

  getModels() {
    return [...this._models];
  }
}

describe('ModelRouter', () => {
  let router;
  let openaiAdapter;
  let googleAdapter;
  let localAdapter;

  beforeEach(() => {
    openaiAdapter = new MockAdapter('openai', ['gpt-4o', 'gpt-4o-mini', 'o3-mini']);
    googleAdapter = new MockAdapter('google', ['gemini-2.0-flash', 'gemini-2.0-pro']);
    localAdapter = new MockAdapter('local', ['llama3', 'mistral', 'deepseek-r1']);

    router = new ModelRouter({
      adapters: {
        openai: openaiAdapter,
        google: googleAdapter,
        local: localAdapter,
      },
    });
  });

  test('registers adapters from config', () => {
    expect(router.getRegisteredProviders()).toEqual(['openai', 'google', 'local']);
  });

  test('registerAdapter adds new adapter', () => {
    const r = new ModelRouter();
    r.registerAdapter(openaiAdapter);
    expect(r.getRegisteredProviders()).toContain('openai');
  });

  test('getAvailableModels returns all models', () => {
    const models = router.getAvailableModels();
    expect(models).toContain('gpt-4o');
    expect(models).toContain('gemini-2.0-flash');
    expect(models).toContain('llama3');
    expect(models.length).toBe(8);
  });

  test('selectModel with cheapest strategy', () => {
    const model = router.selectModel({ strategy: 'cheapest' });
    // Local models are free, should be selected
    expect(['llama3', 'mistral', 'deepseek-r1']).toContain(model);
  });

  test('selectModel with fastest strategy', () => {
    const model = router.selectModel({ strategy: 'fastest' });
    // Fast latency class models: gpt-4o-mini, gemini-2.0-flash
    // Local models have 'variable' latency, so they may also appear
    expect(model).toBeDefined();
    // Should not pick slow models
    expect(['o3-mini']).not.toContain(model);
  });

  test('selectModel with best strategy', () => {
    const model = router.selectModel({ strategy: 'best' });
    // Premium tier first, then most capabilities
    // gpt-4o is standard with 5 caps
    expect(model).toBeDefined();
  });

  test('selectModel with balanced strategy', () => {
    const model = router.selectModel({ strategy: 'balanced' });
    expect(model).toBeDefined();
  });

  test('selectModel with required capabilities', () => {
    const model = router.selectModel({
      strategy: 'cheapest',
      requiredCapabilities: ['reasoning', 'code'],
    });
    // Must have both reasoning and code
    expect(model).toBeDefined();
  });

  test('selectModel uses task routes', () => {
    router.taskRoutes = { code: 'gpt-4o' };
    const model = router.selectModel({ taskType: 'code' });
    expect(model).toBe('gpt-4o');
  });

  test('selectModel falls back when task route unavailable', () => {
    router.taskRoutes = { code: 'claude-opus-4-6' }; // No anthropic adapter registered
    const model = router.selectModel({ taskType: 'code' });
    // Should fall through to strategy-based selection
    expect(model).toBeDefined();
    expect(model).not.toBe('claude-opus-4-6');
  });

  test('selectModel uses fallback chain', () => {
    // Create router with no adapters
    const r = new ModelRouter({
      fallbackChain: ['gpt-4o', 'llama3'],
      adapters: { local: localAdapter },
    });
    const model = r.selectModel({ requiredCapabilities: ['xyznonexistent'] });
    // No candidates match, falls back to chain
    // gpt-4o has no adapter, llama3 does
    expect(model).toBe('llama3');
  });

  test('selectModel returns null when nothing available', () => {
    const r = new ModelRouter();
    const model = r.selectModel();
    expect(model).toBeNull();
  });

  test('route executes completion on selected model', async () => {
    const response = await router.route({ prompt: 'Hello' }, { strategy: 'cheapest' });
    expect(response.text).toBeDefined();
    expect(response.provider).toBeDefined();
    expect(response.usage).toBeDefined();
  });

  test('route throws when no suitable model', async () => {
    const r = new ModelRouter();
    await expect(r.route({ prompt: 'Hi' }))
      .rejects.toThrow('No suitable model found');
  });

  test('routeWithFallback tries fallback chain on failure', async () => {
    const failingAdapter = new MockAdapter('openai', ['gpt-4o'], async () => {
      throw new Error('API error');
    });

    const r = new ModelRouter({
      adapters: { openai: failingAdapter, local: localAdapter },
      fallbackChain: ['llama3'],
    });

    const response = await r.routeWithFallback({ prompt: 'Hi' }, { strategy: 'best' });
    expect(response.provider).toBe('local');
  });

  test('routeWithFallback throws when all fail', async () => {
    const failingAdapter = new MockAdapter('local', ['llama3'], async () => {
      throw new Error('Connection refused');
    });

    const r = new ModelRouter({
      adapters: { local: failingAdapter },
      fallbackChain: ['llama3'],
    });

    await expect(r.routeWithFallback({ prompt: 'Hi' }))
      .rejects.toThrow('All models failed');
  });

  test('getStats tracks usage', async () => {
    await router.route({ prompt: 'Hi' }, { strategy: 'cheapest' });
    await router.route({ prompt: 'Hi again' }, { strategy: 'cheapest' });

    const stats = router.getStats();
    const models = Object.keys(stats);
    expect(models.length).toBeGreaterThan(0);

    const firstModel = stats[models[0]];
    expect(firstModel.requests).toBe(2);
    expect(firstModel.avgLatencyMs).toBeGreaterThanOrEqual(0);
    expect(firstModel.totalCost).toBeGreaterThanOrEqual(0);
  });

  test('resetStats clears all stats', async () => {
    await router.route({ prompt: 'Hi' }, { strategy: 'cheapest' });
    router.resetStats();
    expect(router.getStats()).toEqual({});
  });

  test('estimateCost calculates correctly', () => {
    const estimate = router.estimateCost('gpt-4o', 1000, 500);
    expect(estimate.model).toBe('gpt-4o');
    expect(estimate.cost).toBeGreaterThan(0);
    expect(estimate.pricing).toBeDefined();
  });

  test('estimateCost uses default for unknown model', () => {
    const estimate = router.estimateCost('unknown-model', 1000000, 1000000);
    expect(estimate.cost).toBe(4); // 1.0 + 3.0
  });

  test('default strategy is balanced', () => {
    expect(router.defaultStrategy).toBe('balanced');
  });

  test('maxCostPerRequest defaults to 0.05', () => {
    expect(router.maxCostPerRequest).toBe(0.05);
  });
});
