/**
 * Dashboard configuration
 *
 * Reads gateway connection settings from environment variables.
 * Falls back to localhost defaults for development.
 */

export interface GatewayConfig {
  /** HTTP URL for REST API calls (server-side) */
  httpUrl: string;
  /** WebSocket URL for real-time events (server-side) */
  wsUrl: string;
  /** HTTP URL for browser-side connections */
  publicHttpUrl: string;
  /** WebSocket URL for browser-side connections */
  publicWsUrl: string;
  /** API key for authenticated gateway (optional) */
  apiKey: string | null;
  /** Whether auth is disabled on the gateway */
  authDisabled: boolean;
}

export function getGatewayConfig(): GatewayConfig {
  const baseUrl = process.env.GYWD_API_URL || 'http://localhost:3945';
  const publicBaseUrl = process.env.NEXT_PUBLIC_GYWD_API_URL || baseUrl;
  const apiKey = process.env.GYWD_API_KEY || null;
  const authDisabled = process.env.GYWD_API_AUTH === 'disabled';

  const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws';
  const publicWsUrl = publicBaseUrl.replace(/^http/, 'ws') + '/ws';

  return {
    httpUrl: baseUrl,
    wsUrl,
    publicHttpUrl: publicBaseUrl,
    publicWsUrl,
    apiKey,
    authDisabled,
  };
}

/**
 * Build fetch headers for gateway API calls
 */
export function getGatewayHeaders(): Record<string, string> {
  const config = getGatewayConfig();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey && !config.authDisabled) {
    headers['X-API-Key'] = config.apiKey;
  }
  return headers;
}

/**
 * Fetch from gateway with error handling
 * Returns null if gateway is unavailable (for fallback logic)
 */
export async function fetchFromGateway<T>(path: string): Promise<T | null> {
  const config = getGatewayConfig();
  const url = `${config.httpUrl}${path}`;

  try {
    const response = await fetch(url, {
      headers: getGatewayHeaders(),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json as T;
  } catch {
    // Gateway unavailable — caller should fall back to direct fs reads
    return null;
  }
}
