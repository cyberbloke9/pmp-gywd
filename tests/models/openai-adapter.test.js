'use strict';

const { OpenAIAdapter } = require('../../lib/models/openai-adapter');

/** Create a mock fetch that returns a canned response */
function mockFetch(responseData, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseData,
    text: async () => JSON.stringify(responseData),
  });
}

describe('OpenAIAdapter', () => {
  test('is an openai provider', () => {
    const adapter = new OpenAIAdapter();
    expect(adapter.getProvider()).toBe('openai');
  });

  test('reads apiKey from config', () => {
    const adapter = new OpenAIAdapter({ apiKey: 'sk-test123' });
    expect(adapter.apiKey).toBe('sk-test123');
  });

  test('uses default model gpt-4o', () => {
    const adapter = new OpenAIAdapter();
    expect(adapter.defaultModel).toBe('gpt-4o');
  });

  test('getModels returns OpenAI models', () => {
    const adapter = new OpenAIAdapter();
    const models = adapter.getModels();
    expect(models).toContain('gpt-4o');
    expect(models).toContain('o1');
    expect(models).toContain('o3');
    expect(models).toContain('gpt-4o-mini');
  });

  test('complete sends correct request format', async () => {
    const fetch = mockFetch({
      id: 'chatcmpl-123',
      model: 'gpt-4o',
      choices: [{ message: { content: 'Hello back!' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });

    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', _fetch: fetch });
    const response = await adapter.complete({
      prompt: 'Hello',
      system: 'Be helpful',
    });

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/chat/completions');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.model).toBe('gpt-4o');
    expect(body.messages).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hello' },
    ]);
    expect(body.temperature).toBe(0.7);

    // Verify response
    expect(response.text).toBe('Hello back!');
    expect(response.provider).toBe('openai');
    expect(response.model).toBe('gpt-4o');
    expect(response.usage.promptTokens).toBe(10);
    expect(response.usage.completionTokens).toBe(5);
    expect(response.usage.totalTokens).toBe(15);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    expect(response.metadata.finishReason).toBe('stop');
  });

  test('complete uses reasoning model format for o1/o3', async () => {
    const fetch = mockFetch({
      model: 'o3',
      choices: [{ message: { content: 'Thought...' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 20, completion_tokens: 100 },
    });

    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', _fetch: fetch });
    await adapter.complete({ prompt: 'Think about this', system: 'Reason deeply', model: 'o3' });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    // System should be mapped to 'developer' for reasoning models
    expect(body.messages[0].role).toBe('developer');
    // Should NOT have temperature
    expect(body.temperature).toBeUndefined();
  });

  test('complete handles API error', async () => {
    const fetch = mockFetch({ error: { message: 'Rate limited' } }, 429);
    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', _fetch: fetch });

    await expect(adapter.complete({ prompt: 'Hi' }))
      .rejects.toThrow('OpenAI API error 429');
  });

  test('complete passes custom options', async () => {
    const fetch = mockFetch({
      model: 'gpt-4o',
      choices: [{ message: { content: 'Ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 1 },
    });

    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', _fetch: fetch });
    await adapter.complete({
      prompt: 'Hi',
      options: { temperature: 0.2, maxTokens: 500, topP: 0.9, stop: ['\n'] },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.2);
    expect(body.max_completion_tokens).toBe(500);
    expect(body.top_p).toBe(0.9);
    expect(body.stop).toEqual(['\n']);
  });

  test('checkAvailability returns false without apiKey', async () => {
    const adapter = new OpenAIAdapter({ apiKey: null });
    const available = await adapter.checkAvailability();
    expect(available).toBe(false);
    expect(adapter.isAvailable()).toBe(false);
  });

  test('checkAvailability returns true on successful API call', async () => {
    const fetch = mockFetch({ data: [] });
    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', _fetch: fetch });
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
    expect(adapter.isAvailable()).toBe(true);
  });

  test('checkAvailability returns false on failed API call', async () => {
    const fetch = mockFetch({}, 401);
    const adapter = new OpenAIAdapter({ apiKey: 'sk-bad', _fetch: fetch });
    const available = await adapter.checkAvailability();
    expect(available).toBe(false);
  });

  test('includes organization header when set', async () => {
    const fetch = mockFetch({
      model: 'gpt-4o',
      choices: [{ message: { content: 'Ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 5, completion_tokens: 1 },
    });

    const adapter = new OpenAIAdapter({ apiKey: 'sk-test', organization: 'org-123', _fetch: fetch });
    await adapter.complete({ prompt: 'Hi' });

    const headers = fetch.mock.calls[0][1].headers;
    expect(headers['OpenAI-Organization']).toBe('org-123');
  });
});
