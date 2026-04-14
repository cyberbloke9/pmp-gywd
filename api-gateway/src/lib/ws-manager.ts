import * as fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server, IncomingMessage } from 'http';
import { parseState, getPatterns, getWatchPaths } from './gywd-data';

interface WsClient {
  ws: WebSocket;
  alive: boolean;
  ip: string;
}

const MAX_CLIENTS_PER_IP = 20;
const MAX_TOTAL_CLIENTS = 1000;

export class WsManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WsClient> = new Set();
  private clientsPerIp: Map<string, number> = new Map();
  private watchers: fs.FSWatcher[] = [];
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req: IncomingMessage) => {
      const ip = req.socket.remoteAddress || 'unknown';

      // Per-IP cap
      const ipCount = this.clientsPerIp.get(ip) || 0;
      if (ipCount >= MAX_CLIENTS_PER_IP) {
        ws.close(1008, 'Too many connections from this IP');
        return;
      }

      // Global cap
      if (this.clients.size >= MAX_TOTAL_CLIENTS) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      const client: WsClient = { ws, alive: true, ip };
      this.clients.add(client);
      this.clientsPerIp.set(ip, ipCount + 1);

      ws.on('pong', () => { client.alive = true; });
      ws.on('close', () => {
        this.clients.delete(client);
        const count = (this.clientsPerIp.get(ip) || 1) - 1;
        if (count <= 0) this.clientsPerIp.delete(ip);
        else this.clientsPerIp.set(ip, count);
      });

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

  /** Broadcast an event to all connected WebSocket clients */
  broadcast(event: string, data: unknown): void {
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
