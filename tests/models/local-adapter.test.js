'use strict';

const { LocalAdapter } = require('../../lib/models/local-adapter');

function mockFetch(responseData, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseData,
    text: async () => JSON.stringify(responseData),
  });
}

describe('LocalAdapter', () => {
  test('is a local provider', () => {
    const adapter = new LocalAdapter();
    expect(adapter.getProvider()).toBe('local');
  });

  test('uses default Ollama URL and llama3 model', () => {
    const adapter = new LocalAdapter();
    expect(adapter.baseUrl).toBe('http://localhost:11434');
    expect(adapter.defaultModel).toBe('llama3');
    expect(adapter.backend).toBe('ollama');
  });

  test('getModels returns local models', () => {
    const adapter = new LocalAdapter();
    const models = adapter.getModels();
    expect(models).toContain('llama3');
    expect(models).toContain('mistral');
    expect(models).toContain('codellama');
    expect(models).toContain('deepseek-r1');
  });

  test('complete sends correct Ollama format', async () => {
    const fetch = mockFetch({
      model: 'llama3',
      message: { role: 'assistant', content: 'Hello from Llama!' },
      prompt_eval_count: 15,
      eval_count: 8,
      total_duration: 1200000000,
    });

    const adapter = new LocalAdapter({ _fetch: fetch });
    const response = await adapter.complete({ prompt: 'Hello', system: 'Be helpful' });

    // Verify URL
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/api/chat');

    // Verify body
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.model).toBe('llama3');
    expect(body.stream).toBe(false);
    expect(body.messages).toEqual([
      { role: 'system', content: 'Be helpful' },
      { role: 'user', content: 'Hello' },
    ]);

    // Verify response
    expect(response.text).toBe('Hello from Llama!');
    expect(response.provider).toBe('local');
    expect(response.usage.promptTokens).toBe(15);
    expect(response.usage.completionTokens).toBe(8);
    expect(response.metadata.backend).toBe('ollama');
  });

  test('complete with llama.cpp backend', async () => {
    const fetch = mockFetch({
      content: 'Hello from llama.cpp!',
      tokens_evaluated: 12,
      tokens_predicted: 6,
      timings: { predicted_per_token_ms: 25 },
    });

    const adapter = new LocalAdapter({ backend: 'llamacpp', _fetch: fetch });
    const response = await adapter.complete({ prompt: 'Hello' });

    const url = fetch.mock.calls[0][0];
    expect(url).toContain('/completion');

    expect(response.text).toBe('Hello from llama.cpp!');
    expect(response.usage.promptTokens).toBe(12);
    expect(response.usage.completionTokens).toBe(6);
    expect(response.metadata.backend).toBe('llamacpp');
  });

  test('complete handles Ollama API error', async () => {
    const fetch = mockFetch({ error: 'model not found' }, 404);
    const adapter = new LocalAdapter({ _fetch: fetch });

    await expect(adapter.complete({ prompt: 'Hi' }))
      .rejects.toThrow('Ollama API error 404');
  });

  test('complete passes Ollama options', async () => {
    const fetch = mockFetch({
      model: 'llama3',
      message: { content: 'Ok' },
      prompt_eval_count: 5,
      eval_count: 1,
    });

    const adapter = new LocalAdapter({ _fetch: fetch });
    await adapter.complete({
      prompt: 'Hi',
      options: { temperature: 0.2, maxTokens: 500, topP: 0.9, stop: ['\n'] },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.options.temperature).toBe(0.2);
    expect(body.options.num_predict).toBe(500);
    expect(body.options.top_p).toBe(0.9);
    expect(body.options.stop).toEqual(['\n']);
  });

  test('checkAvailability for Ollama', async () => {
    const fetch = mockFetch({ models: [] });
    const adapter = new LocalAdapter({ _fetch: fetch });
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
    expect(fetch.mock.calls[0][0]).toContain('/api/tags');
  });

  test('checkAvailability for llama.cpp', async () => {
    const fetch = mockFetch({ status: 'ok' });
    const adapter = new LocalAdapter({ backend: 'llamacpp', _fetch: fetch });
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
    expect(fetch.mock.calls[0][0]).toContain('/health');
  });

  test('checkAvailability returns false on connection failure', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
    const adapter = new LocalAdapter({ _fetch: fetch });
    const available = await adapter.checkAvailability();
    expect(available).toBe(false);
  });

  test('listInstalledModels returns model list', async () => {
    const fetch = mockFetch({
      models: [
        { name: 'llama3:latest' },
        { name: 'mistral:7b' },
      ],
    });

    const adapter = new LocalAdapter({ _fetch: fetch });
    const models = await adapter.listInstalledModels();
    expect(models).toEqual(['llama3:latest', 'mistral:7b']);
  });

  test('listInstalledModels returns empty on failure', async () => {
    const fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
    const adapter = new LocalAdapter({ _fetch: fetch });
    const models = await adapter.listInstalledModels();
    expect(models).toEqual([]);
  });
});
