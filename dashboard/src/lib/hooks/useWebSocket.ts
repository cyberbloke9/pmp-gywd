'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketState {
  connected: boolean;
  lastEvent: { type: string; data: unknown } | null;
  error: string | null;
  reconnecting: boolean;
}

interface WsMessage {
  event: string;
  data: unknown;
  timestamp: string;
}

const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;
const STABLE_CONNECTION_MS = 5000; // Only reset backoff after this much uptime
const HEARTBEAT_TIMEOUT_MS = 60000; // No server event in 60s? Kill and reconnect.

/**
 * useWebSocket — connects to the API gateway WebSocket for real-time events.
 *
 * Same interface as useSSE so components can swap easily.
 * Auto-reconnects with exponential backoff.
 *
 * Falls back to SSE if WebSocket URL is not configured.
 */
export function useWebSocket(wsUrl?: string): WebSocketState {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    lastEvent: null,
    error: null,
    reconnecting: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const getUrl = useCallback(() => {
    if (wsUrl) return wsUrl;
    if (typeof window === 'undefined') return null;
    // Derive WS URL from NEXT_PUBLIC env var or default
    const base = process.env.NEXT_PUBLIC_GYWD_API_URL || 'http://localhost:3945';
    return base.replace(/^http/, 'ws') + '/ws';
  }, [wsUrl]);

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = getUrl();
    if (!url) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      const resetHeartbeatTimer = () => {
        if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
        heartbeatTimerRef.current = setTimeout(() => {
          // No server activity → connection is dead, force reconnect
          if (wsRef.current) wsRef.current.close();
        }, HEARTBEAT_TIMEOUT_MS);
      };

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          connected: true,
          error: null,
          reconnecting: false,
        }));
        // Only reset backoff after STABLE_CONNECTION_MS of uptime (prevents thundering herd on flappy servers)
        if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
        stableTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        }, STABLE_CONNECTION_MS);
        resetHeartbeatTimer();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        resetHeartbeatTimer();
        try {
          const msg: WsMessage = JSON.parse(event.data);
          setState((prev) => ({
            ...prev,
            lastEvent: { type: msg.event, data: msg.data },
          }));
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          error: 'WebSocket error',
        }));
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setState((prev) => ({
          ...prev,
          connected: false,
          reconnecting: true,
        }));

        // Exponential backoff reconnect
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) connect();
        }, delay);
      };
    } catch (err) {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        connected: false,
        error: String(err),
        reconnecting: true,
      }));

      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    }
  }, [getUrl]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
      if (heartbeatTimerRef.current) clearTimeout(heartbeatTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return state;
}
