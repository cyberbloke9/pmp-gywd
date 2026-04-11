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

class GatewayWsClient {
  private ws: WebSocket | null = null;
  private listeners: Set<EventCallback> = new Set();
  private buffer: WsEvent[] = [];
  private connected = false;
  private reconnectDelay = RECONNECT_DELAY_INITIAL;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  connect(): void {
    if (this.closed) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const config = getGatewayConfig();
    const url = config.wsUrl;

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.connected = true;
        this.reconnectDelay = RECONNECT_DELAY_INITIAL;
        this.emit({ event: 'gateway_connected', data: {}, timestamp: new Date().toISOString() });
      });

      this.ws.on('message', (raw: WebSocket.Data) => {
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
        this.scheduleReconnect();
      });

      this.ws.on('error', () => {
        this.connected = false;
        // close event will follow and trigger reconnect
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
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
