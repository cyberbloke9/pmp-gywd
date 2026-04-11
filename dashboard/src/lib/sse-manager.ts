import * as fs from 'fs';
import { getWatchPaths, parseState, getMemoryStats } from './gywd-bridge';
import { getWsClient } from './ws-client';
import type { WsEvent } from './ws-client';

type SSEListener = (event: string, data: unknown) => void;

interface WatcherEntry {
  path: string;
  watcher: fs.FSWatcher | null;
}

interface BufferedEvent {
  event: string;
  data: unknown;
  timestamp: number;
}

/**
 * SSE Manager — gateway-aware with local fallback.
 *
 * Modes:
 *   1. Gateway mode: sources events from the API gateway WebSocket client
 *   2. Local mode: watches GYWD files directly with fs.watch (fallback)
 *
 * Automatically switches to local mode if gateway is unavailable.
 * Buffers recent events for replay to late-joining listeners.
 */
class SSEManager {
  private listeners: Set<SSEListener> = new Set();
  private watchers: WatcherEntry[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceMs = 200;
  private heartbeatMs = 30000;
  private started = false;
  private mode: 'gateway' | 'local' | 'idle' = 'idle';
  private unsubscribeWs: (() => void) | null = null;

  // Event buffer for replay
  private eventBuffer: BufferedEvent[] = [];
  private maxBufferSize = 50;
  private bufferTtlMs = 60000; // 1 minute

  start(): void {
    if (this.started) return;
    this.started = true;

    // Try gateway first, fall back to local
    const wsClient = getWsClient();
    if (wsClient.isConnected()) {
      this.startGatewayMode(wsClient);
    } else {
      this.startLocalMode();
      // Also try to connect to gateway in background
      this.tryGatewayUpgrade(wsClient);
    }

    this.startHeartbeat();
  }

  stop(): void {
    this.started = false;
    this.mode = 'idle';

    // Clean up gateway subscription
    if (this.unsubscribeWs) {
      this.unsubscribeWs();
      this.unsubscribeWs = null;
    }

    // Clean up file watchers
    for (const entry of this.watchers) {
      entry.watcher?.close();
    }
    this.watchers = [];

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  addListener(listener: SSEListener): void {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.start();
    }
  }

  removeListener(listener: SSEListener): void {
    this.listeners.delete(listener);
    if (this.listeners.size === 0) {
      this.stop();
    }
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Get current operating mode
   */
  getMode(): 'gateway' | 'local' | 'idle' {
    return this.mode;
  }

  /**
   * Get buffered events since a timestamp (for replay to late joiners)
   */
  getBufferedEvents(sinceMs?: number): BufferedEvent[] {
    const now = Date.now();
    const since = sinceMs ?? (now - this.bufferTtlMs);
    return this.eventBuffer.filter(e => e.timestamp >= since && e.timestamp <= now);
  }

  /**
   * Replay buffered events to a single listener
   */
  replayTo(listener: SSEListener, sinceMs?: number): number {
    const events = this.getBufferedEvents(sinceMs);
    for (const e of events) {
      try {
        listener(e.event, e.data);
      } catch {
        // Ignore listener errors during replay
      }
    }
    return events.length;
  }

  // ---- Gateway Mode ----

  private startGatewayMode(wsClient: ReturnType<typeof getWsClient>): void {
    this.mode = 'gateway';

    this.unsubscribeWs = wsClient.onEvent((wsEvent: WsEvent) => {
      // Skip internal events
      if (wsEvent.event === 'gateway_connected') return;
      this.bufferAndBroadcast(wsEvent.event, wsEvent.data);
    });
  }

  private tryGatewayUpgrade(wsClient: ReturnType<typeof getWsClient>): void {
    // Listen for gateway connection — if it connects, switch modes
    const unsub = wsClient.onEvent((wsEvent: WsEvent) => {
      if (wsEvent.event === 'gateway_connected' && this.mode === 'local') {
        // Stop local file watching
        for (const entry of this.watchers) {
          entry.watcher?.close();
        }
        this.watchers = [];

        // Switch to gateway mode
        unsub();
        this.startGatewayMode(wsClient);
      }
    });
  }

  // ---- Local Mode (fallback) ----

  private startLocalMode(): void {
    this.mode = 'local';
    this.startWatching();
  }

  private startWatching(): void {
    const paths = getWatchPaths();

    for (const filePath of paths) {
      try {
        if (!fs.existsSync(filePath)) continue;

        const watcher = fs.watch(filePath, () => {
          this.debouncedChange(filePath);
        });

        this.watchers.push({ path: filePath, watcher });
      } catch {
        // Skip files we can't watch
      }
    }
  }

  private debouncedChange(filePath: string): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) {
      clearTimeout(existing);
    }

    this.debounceTimers.set(
      filePath,
      setTimeout(() => {
        this.debounceTimers.delete(filePath);
        this.handleFileChange(filePath);
      }, this.debounceMs),
    );
  }

  private handleFileChange(filePath: string): void {
    const timestamp = new Date().toISOString();

    if (filePath.includes('STATE.md')) {
      const state = parseState();
      this.bufferAndBroadcast('state_changed', { state, timestamp });
    } else if (filePath.includes('patterns.json')) {
      const stats = getMemoryStats();
      this.bufferAndBroadcast('patterns_updated', { count: stats.totalPatterns, timestamp });
    } else {
      this.bufferAndBroadcast('data_updated', { file: filePath, timestamp });
    }
  }

  // ---- Shared ----

  private bufferAndBroadcast(event: string, data: unknown): void {
    // Buffer the event
    this.eventBuffer.push({ event, data, timestamp: Date.now() });

    // Trim buffer
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }

    // Evict stale events
    const cutoff = Date.now() - this.bufferTtlMs;
    while (this.eventBuffer.length > 0 && this.eventBuffer[0].timestamp < cutoff) {
      this.eventBuffer.shift();
    }

    this.broadcast(event, data);
  }

  private broadcast(event: string, data: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // Ignore listener errors
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.broadcast('heartbeat', { timestamp: new Date().toISOString() });
    }, this.heartbeatMs);
  }
}

// Singleton
let instance: SSEManager | null = null;

export function getSSEManager(): SSEManager {
  if (!instance) {
    instance = new SSEManager();
  }
  return instance;
}

export function resetSSEManager(): void {
  if (instance) {
    instance.stop();
    instance = null;
  }
}

export { SSEManager };
