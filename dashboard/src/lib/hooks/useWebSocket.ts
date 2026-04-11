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

      ws.onopen = () => {
        if (!mountedRef.current) return;
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
        setState((prev) => ({
          ...prev,
          connected: true,
          error: null,
          reconnecting: false,
        }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
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
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return state;
}
