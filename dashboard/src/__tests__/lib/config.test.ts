describe('Gateway Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns default config without env vars', () => {
    delete process.env.GYWD_API_URL;
    delete process.env.NEXT_PUBLIC_GYWD_API_URL;
    delete process.env.GYWD_API_KEY;
    delete process.env.GYWD_API_AUTH;

    const { getGatewayConfig } = require('@/lib/config');
    const config = getGatewayConfig();

    expect(config.httpUrl).toBe('http://localhost:3945');
    expect(config.wsUrl).toBe('ws://localhost:3945/ws');
    expect(config.publicHttpUrl).toBe('http://localhost:3945');
    expect(config.publicWsUrl).toBe('ws://localhost:3945/ws');
    expect(config.apiKey).toBeNull();
    expect(config.authDisabled).toBe(false);
  });

  it('reads custom URLs from env', () => {
    process.env.GYWD_API_URL = 'http://gateway:4000';
    process.env.NEXT_PUBLIC_GYWD_API_URL = 'http://public-gateway:4000';

    const { getGatewayConfig } = require('@/lib/config');
    const config = getGatewayConfig();

    expect(config.httpUrl).toBe('http://gateway:4000');
    expect(config.wsUrl).toBe('ws://gateway:4000/ws');
    expect(config.publicHttpUrl).toBe('http://public-gateway:4000');
    expect(config.publicWsUrl).toBe('ws://public-gateway:4000/ws');
  });

  it('reads API key from env', () => {
    process.env.GYWD_API_KEY = 'test-key-123';

    const { getGatewayConfig } = require('@/lib/config');
    const config = getGatewayConfig();

    expect(config.apiKey).toBe('test-key-123');
  });

  it('detects auth disabled', () => {
    process.env.GYWD_API_AUTH = 'disabled';

    const { getGatewayConfig } = require('@/lib/config');
    const config = getGatewayConfig();

    expect(config.authDisabled).toBe(true);
  });

  it('converts https to wss', () => {
    process.env.GYWD_API_URL = 'https://secure-gateway:443';

    const { getGatewayConfig } = require('@/lib/config');
    const config = getGatewayConfig();

    expect(config.wsUrl).toBe('wss://secure-gateway:443/ws');
  });

  it('getGatewayHeaders includes API key', () => {
    process.env.GYWD_API_KEY = 'my-key';
    delete process.env.GYWD_API_AUTH;

    const { getGatewayHeaders } = require('@/lib/config');
    const headers = getGatewayHeaders();

    expect(headers['X-API-Key']).toBe('my-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('getGatewayHeaders omits API key when auth disabled', () => {
    process.env.GYWD_API_KEY = 'my-key';
    process.env.GYWD_API_AUTH = 'disabled';

    const { getGatewayHeaders } = require('@/lib/config');
    const headers = getGatewayHeaders();

    expect(headers['X-API-Key']).toBeUndefined();
  });

  it('getGatewayHeaders omits API key when not set', () => {
    delete process.env.GYWD_API_KEY;

    const { getGatewayHeaders } = require('@/lib/config');
    const headers = getGatewayHeaders();

    expect(headers['X-API-Key']).toBeUndefined();
  });

  it('fetchFromGateway returns null on network error', async () => {
    const { fetchFromGateway } = require('@/lib/config');

    // No gateway running — should return null
    const result = await fetchFromGateway('/api/v1/status');
    expect(result).toBeNull();
  });
});
