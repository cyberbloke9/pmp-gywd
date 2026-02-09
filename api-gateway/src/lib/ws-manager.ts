import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { parseState, getPatterns, getWatchPaths } from './gywd-data';

interface WsClient {
  ws: WebSocket;
  alive: boolean;
}

export class WsManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WsClient> = new Set();
  private watchers: fs.FSWatcher[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      const client: WsClient = { ws, alive: true };
      this.clients.add(client);

      ws.on('pong', () => { client.alive = true; });
      ws.on('close', () => { this.clients.delete(client); });

      // Send welcome
      this.send(ws, 'connected', { timestamp: new Date().toISOString(), clients: this.clients.size });
    });

    this.startWatching();
    this.startHeartbeat();
  }

  close(): void {
    for (const watcher of this.watchers) {
      watcher.close();
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

    this.wss?.close();
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private broadcast(event: string, data: unknown): void {
    const message = JSON.stringify({ event, data, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  private send(ws: WebSocket, event: string, data: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data, timestamp: new Date().toISOString() }));
    }
  }

  private startWatching(): void {
    const paths = getWatchPaths();
    for (const filePath of paths) {
      try {
        if (!fs.existsSync(filePath)) continue;
        const watcher = fs.watch(filePath, () => this.debouncedChange(filePath));
        this.watchers.push(watcher);
      } catch {
        // Skip
      }
    }
  }

  private debouncedChange(filePath: string): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(filePath, setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.handleChange(filePath);
    }, 200));
  }

  private handleChange(filePath: string): void {
    if (filePath.includes('STATE.md')) {
      this.broadcast('state_changed', { state: parseState() });
    } else if (filePath.includes('patterns.json')) {
      this.broadcast('patterns_updated', { count: getPatterns().length });
    } else {
      this.broadcast('data_updated', { file: filePath });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const client of this.clients) {
        if (!client.alive) {
          client.ws.terminate();
          this.clients.delete(client);
          continue;
        }
        client.alive = false;
        client.ws.ping();
      }
    }, 30000);
  }
}
