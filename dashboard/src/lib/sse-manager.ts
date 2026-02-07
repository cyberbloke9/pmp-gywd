import * as fs from 'fs';
import { getWatchPaths, parseState, getMemoryStats } from './gywd-bridge';

type SSEListener = (event: string, data: unknown) => void;

interface WatcherEntry {
  path: string;
  watcher: fs.FSWatcher | null;
}

class SSEManager {
  private listeners: Set<SSEListener> = new Set();
  private watchers: WatcherEntry[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private debounceMs = 200;
  private heartbeatMs = 30000;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.startWatching();
    this.startHeartbeat();
  }

  stop(): void {
    this.started = false;

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

  private broadcast(event: string, data: unknown): void {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch {
        // Ignore listener errors
      }
    }
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
      }, this.debounceMs)
    );
  }

  private handleFileChange(filePath: string): void {
    const timestamp = new Date().toISOString();

    if (filePath.includes('STATE.md')) {
      const state = parseState();
      this.broadcast('state_changed', { state, timestamp });
    } else if (filePath.includes('patterns.json')) {
      const stats = getMemoryStats();
      this.broadcast('patterns_updated', { count: stats.totalPatterns, timestamp });
    } else {
      this.broadcast('data_updated', { file: filePath, timestamp });
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

export { SSEManager };
