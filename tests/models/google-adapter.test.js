'use strict';

const { GoogleAdapter } = require('../../lib/models/google-adapter');

function mockFetch(responseData, status = 200) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseData,
    text: async () => JSON.stringify(responseData),
  });
}

describe('GoogleAdapter', () => {
  test('is a google provider', () => {
    const adapter = new GoogleAdapter();
    expect(adapter.getProvider()).toBe('google');
  });

  test('uses default model gemini-2.0-flash', () => {
    const adapter = new GoogleAdapter();
    expect(adapter.defaultModel).toBe('gemini-2.0-flash');
  });

  test('getModels returns Google models', () => {
    const adapter = new GoogleAdapter();
    const models = adapter.getModels();
    expect(models).toContain('gemini-2.0-flash');
    expect(models).toContain('gemini-2.0-pro');
    expect(models).toContain('gemini-1.5-pro');
  });

  test('complete sends correct Gemini format', async () => {
    const fetch = mockFetch({
      candidates: [{
        content: { parts: [{ text: 'Hello from Gemini!' }] },
        finishReason: 'STOP',
      }],
      usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4 },
    });

    const adapter = new GoogleAdapter({ apiKey: 'test-key', _fetch: fetch });
    const response = await adapter.complete({
      prompt: 'Hello',
      system: 'Be helpful',
    });

    // Verify URL includes model and API key
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('gemini-2.0-flash:generateContent');
    expect(url).toContain('key=test-key');

    // Verify body format
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.systemInstruction).toEqual({ parts: [{ text: 'Be helpful' }] });
    expect(body.contents[0].role).toBe('user');
    expect(body.contents[0].parts[0].text).toBe('Hello');

    // Verify response
    expect(response.text).toBe('Hello from Gemini!');
    expect(response.provider).toBe('google');
    expect(response.usage.promptTokens).toBe(8);
    expect(response.usage.completionTokens).toBe(4);
  });

  test('complete maps assistant role to model', async () => {
    const fetch = mockFetch({
      candidates: [{ content: { parts: [{ text: 'Ok' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 },
    });

    const adapter = new GoogleAdapter({ apiKey: 'test-key', _fetch: fetch });
    await adapter.complete({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello' },
        { role: 'user', content: 'How are you?' },
      ],
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.contents[1].role).toBe('model');
  });

  test('complete handles API error', async () => {
    const fetch = mockFetch({ error: { message: 'Invalid key' } }, 403);
    const adapter = new GoogleAdapter({ apiKey: 'bad-key', _fetch: fetch });

    await expect(adapter.complete({ prompt: 'Hi' }))
      .rejects.toThrow('Google API error 403');
  });

  test('complete passes generation config', async () => {
    const fetch = mockFetch({
      candidates: [{ content: { parts: [{ text: 'Ok' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 1 },
    });

    const adapter = new GoogleAdapter({ apiKey: 'test-key', _fetch: fetch });
    await adapter.complete({
      prompt: 'Hi',
      options: { temperature: 0.3, maxTokens: 2000, stop: ['END'] },
    });

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.generationConfig.temperature).toBe(0.3);
    expect(body.generationConfig.maxOutputTokens).toBe(2000);
    expect(body.generationConfig.stopSequences).toEqual(['END']);
  });

  test('checkAvailability returns false without apiKey', async () => {
    const adapter = new GoogleAdapter({ apiKey: null });
    const available = await adapter.checkAvailability();
    expect(available).toBe(false);
  });

  test('checkAvailability returns true on success', async () => {
    const fetch = mockFetch({ models: [] });
    const adapter = new GoogleAdapter({ apiKey: 'test-key', _fetch: fetch });
    const available = await adapter.checkAvailability();
    expect(available).toBe(true);
  });

  test('handles multi-part response', async () => {
    const fetch = mockFetch({
      candidates: [{
        content: { parts: [{ text: 'Part 1 ' }, { text: 'Part 2' }] },
        finishReason: 'STOP',
      }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 4 },
    });

    const adapter = new GoogleAdapter({ apiKey: 'test-key', _fetch: fetch });
    const response = await adapter.complete({ prompt: 'Hi' });
    expect(response.text).toBe('Part 1 Part 2');
  });
});
