/**
 * Server-side WebSocket client for connecting the Next.js dashboard
 * to the GYWD API Gateway.
 *
 * Singleton — one WS connection per dashboard server process.
 * Buffers recent events for late-joining SSE listeners.
 */

import WebSocket from 'ws';
import { getGatewayConfig } from './config';

export interface WsEvent {
  event: string;
  data: unknown;
  timestamp: string;
}

type EventCallback = (event: WsEvent) => void;

const MAX_BUFFER_SIZE = 50;
const RECONNECT_DELAY_INITIAL = 1000;
const RECONNECT_DELAY_MAX = 30000;
const STABLE_CONNECTION_MS = 5000;
const HEARTBEAT_TIMEOUT_MS = 60000;

class GatewayWsClient {
  private ws: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private buffer: WsEvent[] = [];
  private connected = false;
  private reconnectDelay = RECONNECT_DELAY_INITIAL;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stableTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  private resetHeartbeatTimer(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      // Treat dead silence as disconnect
      if (this.ws) this.ws.close();
    }, HEARTBEAT_TIMEOUT_MS);
  }

  connect(): void {
    if (this.closed) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    // Dedup: close any half-open prior socket before creating a new one
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }

    const config = getGatewayConfig();
    const url = config.wsUrl;

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        // Only reset backoff after STABLE_CONNECTION_MS uptime
        if (this.stableTimer) clearTimeout(this.stableTimer);
        this.stableTimer = setTimeout(() => {
          this.reconnectDelay = RECONNECT_DELAY_INITIAL;
        }, STABLE_CONNECTION_MS);
        this.resetHeartbeatTimer();
        this.emit({ event: 'gateway_connected', data: {}, timestamp: new Date().toISOString() });
      });

      this.ws.on('message', (raw: WebSocket.Data) => {
        this.resetHeartbeatTimer();
        try {
          const msg = JSON.parse(raw.toString()) as WsEvent;
          this.bufferEvent(msg);
          this.emit(msg);
        } catch {
          // Ignore malformed messages
        }
      });

      this.ws.on('close', () => {
        this.connected = false;
        if (this.stableTimer) { clearTimeout(this.stableTimer); this.stableTimer = null; }
        if (this.heartbeatTimer) { clearTimeout(this.heartbeatTimer); this.heartbeatTimer = null; }
        this.scheduleReconnect();
      });

      this.ws.on('error', () => {
        this.connected = false;
      });
    } catch {
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_DELAY_MAX);
      this.connect();
    }, this.reconnectDelay);
  }

  private bufferEvent(event: WsEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }
  }

  private emit(event: WsEvent): void {
    for (const cb of this.listeners) {
      try {
        cb(event);
      } catch {
        // Don't let one listener break others
      }
    }
  }

  /**
   * Register an event listener
   */
  onEvent(callback: EventCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get recent buffered events
   */
  getRecentEvents(limit?: number): WsEvent[] {
    const n = limit ?? MAX_BUFFER_SIZE;
    return this.buffer.slice(-n);
  }

  /**
   * Check if connected to gateway
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Close the connection permanently
   */
  close(): void {
    this.closed = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.stableTimer) { clearTimeout(this.stableTimer); this.stableTimer = null; }
    if (this.heartbeatTimer) { clearTimeout(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

// Singleton instance
let instance: GatewayWsClient | null = null;

/**
 * Get the singleton WS client.
 * Lazily connects on first call.
 */
export function getWsClient(): GatewayWsClient {
  if (!instance) {
    instance = new GatewayWsClient();
    instance.connect();
  }
  return instance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetWsClient(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
